import { z } from 'zod'
import { validateBody } from '@server/utils/validation'
import { testSmtpConnection, sendTestEmail } from '@server/utils/email'
import { logAdminAction } from '@server/utils/audit'

defineRouteMeta({
  openAPI: {
    tags: ['Admin'],
    summary: 'Test SMTP configuration',
    description: 'Tests SMTP connection and optionally sends a test email. Admin only.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email', description: 'Email address to send test to' }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Test result' },
      400: { description: 'SMTP not configured' },
      401: { description: 'Not authenticated' },
      403: { description: 'Admin access required' }
    }
  }
})

const testEmailSchema = z.object({
  email: z.string().email().optional()
})

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, testEmailSchema)

  // Test SMTP connection
  const connectionResult = await testSmtpConnection()

  if (!connectionResult.success) {
    return {
      success: false,
      connection: false,
      error: connectionResult.error
    }
  }

  // If email provided, send a test email
  if (body.email) {
    const sent = await sendTestEmail(body.email)

    // Audit log
    await logAdminAction(event, {
      action: 'settings.email_test',
      targetType: 'settings',
      details: {
        testType: 'connection_and_send',
        emailTo: body.email,
        success: sent
      }
    })

    return {
      success: sent,
      connection: true,
      email_sent: sent,
      email_to: body.email
    }
  }

  // Audit log for connection test only
  await logAdminAction(event, {
    action: 'settings.email_test',
    targetType: 'settings',
    details: {
      testType: 'connection_only',
      success: true
    }
  })

  return {
    success: true,
    connection: true
  }
})
