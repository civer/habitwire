# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.5] - 2025-12-16

### Added
- **PWA Support** - Install HabitWire as a Progressive Web App on mobile and desktop
  - Install prompt with "add to home screen" functionality
  - Service worker with asset caching for faster load times
  - Web app manifest with proper icons
- **Data Export** - Export your habits and check-ins from the settings page
  - JSON format for full data backup
  - CSV format for spreadsheet analysis
- **Undo for Archive** - Toast notification with undo action when archiving habits
- **Accessibility Improvements**
  - Skip-to-content link for keyboard navigation
  - ARIA labels on interactive elements (color mode toggle, user menu)
  - Improved button semantics for habit day buttons
- **Notes on Check-in** - Add optional notes when checking habits
  - Global setting to enable/disable notes feature
  - Per-habit setting to prompt for notes on check-in

### Fixed
- Streak calculation now correctly handles skipped days based on user settings
- "Skipped breaks streak" setting properly affects streak counts
- Habit detail page header layout with tags aligned inline

## [0.9.4] - 2024-12-15

### Fixed
- Week header alignment after skip button was moved to dropdown menu

> An emergency patch for such a small thing? Yes, I couldn't look at it for another day.
> (Also a good opportunity to test the hotfix workflow.)

## [0.9.3] - 2024-12-15

### Added
- Archive management page to view and restore archived habits
- Version number display in header and login page
- Archive link on dashboard (only visible when archived habits exist)

### Fixed
- Complete i18n coverage for all UI strings (toast messages, heatmap, error messages)
- Form validation for WEEKLY frequency now requires at least one active day
- Form validation for CUSTOM frequency properly validates frequency value
- Validation errors now clear when switching between frequency types
- Archive link updates instantly when archiving a habit
- Skip action moved to dropdown menu for better UX on mobile and desktop

### Changed
- App description now translatable via i18n
- Simplified CI pipeline with documented branching strategy

## [0.9.2] - 2024-12-15

### Added
- Configurable desktop week view (7, 14, 21, or 28 days)
- Week start day setting (Monday or Sunday)
- Visual week separators in habit day view
- New settings page layout with sidebar navigation
- Settings categories: General, Display, Categories, API Keys, Security

### Changed
- Default desktop view now shows 14 days instead of 7
- Settings page redesigned with left-aligned navigation
- Green target SVG favicon

### Fixed
- CUSTOM frequency type no longer requires active_days field
- Habit name display in flexible layout

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

[0.9.5]: https://github.com/civer/habitwire/releases/tag/v0.9.5
[0.9.4]: https://github.com/civer/habitwire/releases/tag/v0.9.4
[0.9.3]: https://github.com/civer/habitwire/releases/tag/v0.9.3
[0.9.2]: https://github.com/civer/habitwire/releases/tag/v0.9.2
[0.9.1]: https://github.com/civer/habitwire/releases/tag/v0.9.1
[0.9.0]: https://github.com/civer/habitwire/releases/tag/v0.9.0