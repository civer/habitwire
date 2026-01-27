import type { H3Event } from 'h3'
import { db } from '@server/database'
import { adminAuditLogs } from '@server/database/schema'

export type AuditAction
  = 'user.create'
    | 'user.update'
    | 'user.delete'
    | 'user.password_reset'
    | 'settings.update'
    | 'settings.email_test'

interface AuditLogOptions {
  action: AuditAction
  targetType?: 'user' | 'settings'
  targetId?: string
  details?: Record<string, unknown>
}

/**
 * Log an admin action for audit purposes
 */
export async function logAdminAction(
  event: H3Event,
  options: AuditLogOptions
): Promise<void> {
  const adminId = event.context.userId

  // Get IP address (handle proxies)
  const forwardedFor = getHeader(event, 'x-forwarded-for')
  const ipAddress = forwardedFor?.split(',')[0]?.trim() || getHeader(event, 'x-real-ip') || 'unknown'

  const userAgent = getHeader(event, 'user-agent') || 'unknown'

  try {
    await db.insert(adminAuditLogs).values({
      adminId,
      action: options.action,
      targetType: options.targetType,
      targetId: options.targetId,
      details: options.details,
      ipAddress,
      userAgent
    })
  } catch (error) {
    // Don't fail the request if audit logging fails, but log the error
    console.error('[audit] Failed to log admin action:', error)
  }
}
