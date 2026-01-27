import { getAllSystemSettings, SETTINGS_KEYS, isSmtpConfigured } from '@server/utils/settings'

defineRouteMeta({
  openAPI: {
    tags: ['Admin'],
    summary: 'Get all system settings',
    description: 'Returns all system settings. Admin only. SMTP password is not returned.',
    responses: {
      200: { description: 'System settings' },
      401: { description: 'Not authenticated' },
      403: { description: 'Admin access required' }
    }
  }
})

export default defineEventHandler(async () => {
  const [settings, smtpConfigured] = await Promise.all([
    getAllSystemSettings(),
    isSmtpConfigured()
  ])

  // Don't expose SMTP password
  if (settings[SETTINGS_KEYS.EMAIL_SMTP_PASSWORD]) {
    settings[SETTINGS_KEYS.EMAIL_SMTP_PASSWORD] = '***'
  }

  return { settings, smtp_configured: smtpConfigured }
})
