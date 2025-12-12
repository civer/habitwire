defineRouteMeta({
  openAPI: {
    tags: ['Authentication'],
    summary: 'Logout',
    description: 'Ends the current user session.',
    responses: {
      200: { description: 'Logout successful' }
    }
  }
})

export default defineEventHandler(async (event) => {
  await clearUserSession(event)

  return { success: true }
})
