import { getAuthSettings, isSmtpConfigured } from '@server/utils/settings'

defineRouteMeta({
  openAPI: {
    tags: ['Authentication'],
    summary: 'Get public auth settings',
    description: 'Returns public authentication settings (allowed methods, registration, etc.).',
    responses: {
      200: { description: 'Auth settings' }
    }
  }
})

export default defineEventHandler(async () => {
  const authSettings = await getAuthSettings()
  const smtpConfigured = await isSmtpConfigured()

  // Filter methods based on what's actually available
  const availableMethods = authSettings.methods.filter((method) => {
    // Magic link requires SMTP
    if (method === 'magic-link' && !smtpConfigured) {
      return false
    }
    return true
  })

  return {
    allow_registration: authSettings.allowRegistration,
    require_email_verification: authSettings.requireEmailVerification,
    methods: availableMethods,
    smtp_configured: smtpConfigured
  }
})
