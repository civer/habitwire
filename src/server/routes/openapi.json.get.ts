// OpenAPI types for the spec structure
interface OpenAPIOperation {
  tags?: string[]
  operationId?: string
  summary?: string
  description?: string
  parameters?: unknown[]
  requestBody?: unknown
  responses?: Record<string, unknown>
}

interface OpenAPIPathItem {
  get?: OpenAPIOperation
  post?: OpenAPIOperation
  put?: OpenAPIOperation
  delete?: OpenAPIOperation
  patch?: OpenAPIOperation
  [key: string]: OpenAPIOperation | undefined
}

interface OpenAPITag {
  name: string
  description?: string
}

interface OpenAPISpec {
  openapi: string
  info: Record<string, unknown>
  paths?: Record<string, OpenAPIPathItem>
  tags?: OpenAPITag[]
  components?: Record<string, unknown>
  servers?: unknown[]
}

export default defineEventHandler(async () => {
  // Fetch the original OpenAPI spec
  const spec = await $fetch<OpenAPISpec>('/_openapi.json')

  if (!spec?.paths) {
    return spec
  }

  // Patterns to hide from docs
  const hidePatterns = [
    /^$/, // Empty path (root route)
    /^\/_/, // All underscore-prefixed routes
    /^\/api\/_/, // API underscore routes
    /^\/api-docs$/, // API docs itself
    /\/__nuxt/, // Nuxt internal
    /\/_nuxt/, // Nuxt assets
    /\/_nitro/, // Nitro internal
    /^\/openapi\.json$/ // This endpoint itself
  ]

  // Filter out internal routes
  const filteredPaths: Record<string, OpenAPIPathItem> = {}
  for (const [path, methods] of Object.entries(spec.paths)) {
    const shouldHide = hidePatterns.some(pattern => pattern.test(path))
    if (!shouldHide) {
      filteredPaths[path] = methods
    }
  }
  spec.paths = filteredPaths

  // Remove empty/unused tags
  if (spec.tags) {
    const usedTags = new Set<string>()
    for (const methods of Object.values(filteredPaths)) {
      for (const method of Object.values(methods)) {
        if (method?.tags) {
          method.tags.forEach((tag: string) => usedTags.add(tag))
        }
      }
    }
    spec.tags = spec.tags.filter(tag =>
      usedTags.has(tag.name)
    )
  }

  return spec
})
