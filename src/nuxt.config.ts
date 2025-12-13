import { fileURLToPath } from 'node:url'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    'nuxt-auth-utils',
    '@nuxtjs/i18n',
    'nuxt-security'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    rateLimitPerMinute: 1000 // RATE_LIMIT_PER_MINUTE from .env
  },

  alias: {
    '@server': fileURLToPath(new URL('./server', import.meta.url))
  },

  routeRules: {
    // Rate limit auth endpoints more strictly
    '/api/v1/auth/login': {
      security: {
        rateLimiter: {
          tokensPerInterval: 5,
          interval: 60000
        }
      }
    },
    '/api/v1/auth/password': {
      security: {
        rateLimiter: {
          tokensPerInterval: 5,
          interval: 60000
        }
      }
    }
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    // Enable top-level await for dynamic imports
    esbuild: {
      options: {
        target: 'es2022'
      }
    },
    experimental: {
      openAPI: true
    },
    openAPI: {
      meta: {
        title: 'HabitWire API',
        description: `
HabitWire is a self-hosted habit tracking application. This API allows you to manage habits, track check-ins, and organize your habits into categories.

## API Versioning

Current version: **v1**. All endpoints are under \`/api/v1/\`.

## Authentication

The API supports two authentication methods:

- **Session-based**: Login via \`/api/v1/auth/login\` to create a session cookie
- **API Key**: Pass an \`Authorization: ApiKey <key>\` header for programmatic access

## Getting Started

1. Login or create an API key in Settings
2. Create categories to organize your habits
3. Create habits with different types (simple check or target value)
4. Track your progress with daily check-ins

## Habit Types

- **SIMPLE**: Binary habits - either done or not done
- **TARGET**: Goal-based habits with a target value (e.g., drink 2000ml water)
        `.trim(),
        version: '1.0.0'
      },
      route: '/_openapi.json',
      production: 'runtime'
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'de', name: 'Deutsch', file: 'de.json' }
    ],
    defaultLocale: 'en',
    bundle: {
      fullInstall: false
    },
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      fallbackLocale: 'en'
    }
  },

  security: {
    headers: {
      crossOriginEmbedderPolicy: false, // Required for some external resources
      contentSecurityPolicy: {
        'default-src': ['\'self\''],
        'script-src': ['\'self\'', '\'unsafe-inline\'', '\'unsafe-eval\''], // Vue needs these
        'style-src': ['\'self\'', '\'unsafe-inline\''],
        'img-src': ['\'self\'', 'data:', 'blob:'],
        'font-src': ['\'self\''],
        'connect-src': ['\'self\''],
        'frame-ancestors': ['\'none\'']
      },
      xFrameOptions: 'DENY',
      xContentTypeOptions: 'nosniff',
      referrerPolicy: 'strict-origin-when-cross-origin'
    },
    rateLimiter: {
      tokensPerInterval: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '1000', 10),
      interval: 60000, // 1 minute
      headers: true,
      driver: {
        name: 'lruCache'
      }
    },
    requestSizeLimiter: {
      maxRequestSizeInBytes: 1048576, // 1MB
      maxUploadFileRequestInBytes: 8388608 // 8MB
    }
  }
})
