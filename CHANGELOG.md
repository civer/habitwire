# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.1] - 2024-12-13

### Fixed
- Docker build failures due to database initialization during build phase
- Authentication redirect loop on prerendered pages
- Session not persisting after login (added `refreshSession()` call)
- TypeScript error with `import.meta.env` check

### Changed
- CI now uses native ARM64 runners for faster multi-architecture builds
- Docker images are now built only on version tags (`v*`)
- Docker images tagged with version number (e.g., `0.9.1`) and `latest`
- Migrations moved to `server/assets/migrations/` for proper Nitro bundling
- Combined migration and seed plugins into single `00.init.ts` for sequential execution

### Improved
- Docker Compose conventions with proper stack naming
- Documentation updates for Docker, Nitro plugins, and auth handling

## [0.9.0] - 2024-12-12

### Added
- Initial open source release
- Core habit tracking functionality
  - Simple (yes/no) and Target-based habits
  - Daily, weekly, and custom frequency options
  - Smart streak tracking with skip handling
- Categories with custom colors and icons
- GitHub-style activity heatmap visualization
- Comprehensive statistics and analytics
- REST API with OpenAPI/Swagger documentation
- API key authentication for external clients
- Multi-language support (English and German)
- Dark mode with system preference detection
- Mobile-responsive design
- PostgreSQL database with Drizzle ORM
- Docker support for easy deployment
- Automated database migrations
- Rate limiting for API endpoints
- Secure session-based authentication for web UI
- Password change functionality
- Comprehensive test suite (unit and integration tests)

### Security
- Passwords hashed using scrypt (via nuxt-auth-utils)
- API keys hashed with SHA-256
- Session cookies encrypted and HTTP-only
- CSP headers configured
- Request size limits enforced

### Known Issues
- 4 moderate npm audit vulnerabilities in development dependencies (esbuild via drizzle-kit)
  - Only affects development environment, no production impact
  - Will be resolved with future drizzle-kit updates

### Notes
- This is a pre-1.0 release intended for early adopters and contributors
- Database schema may change before 1.0 release (migrations will be provided)
- Multi-user support planned for future releases

[0.9.1]: https://github.com/civer/habitwire/releases/tag/v0.9.1
[0.9.0]: https://github.com/civer/habitwire/releases/tag/v0.9.0