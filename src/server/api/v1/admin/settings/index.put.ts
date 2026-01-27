import { setSystemSetting, deleteSystemSetting, SETTINGS_KEYS, invalidateSettingsCache } from '@server/utils/settings'
import { encryptSmtpPassword, invalidateTransporterCache } from '@server/utils/email'
import { updateSystemSettingsSchema, validateBody } from '@server/utils/validation'
import { logAdminAction } from '@server/utils/audit'

defineRouteMeta({
  openAPI: {
    tags: ['Admin'],
    summary: 'Update system settings',
    description: 'Updates system settings. Admin only.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              'auth.allowRegistration': { type: 'boolean' },
              'auth.requireEmailVerification': { type: 'boolean' },
              'auth.methods': { type: 'array', items: { type: 'string', enum: ['password', 'magic-link'] } },
              'email.smtp.host': { type: 'string' },
              'email.smtp.port': { type: 'integer' },
              'email.smtp.user': { type: 'string' },
              'email.smtp.password': { type: 'string' },
              'email.smtp.from': { type: 'string', format: 'email' },
              'email.smtp.secure': { type: 'boolean' }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Settings updated' },
      400: { description: 'Validation error' },
      401: { description: 'Not authenticated' },
      403: { description: 'Admin access required' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, updateSystemSettingsSchema)

  // Update each setting that was provided
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue

    // Skip if it's the masked password placeholder
    if (key === SETTINGS_KEYS.EMAIL_SMTP_PASSWORD && value === '***') {
      continue
    }

    // Delete setting if value is null (revert to default)
    if (value === null) {
      await deleteSystemSetting(key)
      continue
    }

    let finalValue = value

    // Encrypt SMTP password before storing
    if (key === SETTINGS_KEYS.EMAIL_SMTP_PASSWORD) {
      finalValue = encryptSmtpPassword(value as string)
    }

    await setSystemSetting(key, finalValue)
  }

  // Invalidate transporter cache if any email settings changed
  const emailSettingsChanged = Object.keys(body).some(key => key.startsWith('email.'))
  if (emailSettingsChanged) {
    invalidateTransporterCache()
    invalidateSettingsCache()
  }

  // Build list of changed settings for audit (without sensitive values)
  const changedSettings = Object.keys(body).filter((key) => {
    const value = body[key as keyof typeof body]
    return value !== undefined && !(key === SETTINGS_KEYS.EMAIL_SMTP_PASSWORD && value === '***')
  })

  // Audit log
  await logAdminAction(event, {
    action: 'settings.update',
    targetType: 'settings',
    details: {
      changedSettings,
      // Don't log actual values for security, just which settings changed
      emailSettingsChanged
    }
  })

  return { success: true }
})
