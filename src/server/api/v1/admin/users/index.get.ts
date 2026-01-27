import { db } from '@server/database'

defineRouteMeta({
  openAPI: {
    tags: ['Admin'],
    summary: 'List all users',
    description: 'Returns a list of all users. Admin only.',
    responses: {
      200: { description: 'List of users' },
      401: { description: 'Not authenticated' },
      403: { description: 'Admin access required' }
    }
  }
})

export default defineEventHandler(async () => {
  const allUsers = await db.query.users.findMany({
    columns: {
      id: true,
      username: true,
      email: true,
      emailVerified: true,
      isAdmin: true,
      displayName: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: (users, { asc }) => asc(users.createdAt)
  })

  return {
    users: allUsers.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      email_verified: user.emailVerified,
      is_admin: user.isAdmin,
      display_name: user.displayName,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    }))
  }
})
