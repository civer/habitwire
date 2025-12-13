# HabitWire

Self-hosted, API-first habit tracker with a modern web UI.

## Table of Contents

- [Features](#features)
- [Roadmap](#roadmap)
- [Screenshots](#screenshots)
- [Installation](#installation)
  - [Docker (Recommended)](#docker-recommended)
  - [Environment Variables](#environment-variables)
- [Development](#development)
  - [Prerequisites](#prerequisites)
  - [Local Setup](#local-setup)
  - [Local Docker Build](#local-docker-build)
- [Tech Stack](#tech-stack)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
  - [AI-Assisted Development](#ai-assisted-development)
- [License](#license)

## Features

- **Habit Tracking** - Create and manage daily, weekly, or custom frequency habits
- **Two Habit Types** - Simple (yes/no) or Target-based (track progress towards a goal)
- **Streak Tracking** - Monitor current and longest streaks with smart skip handling
- **Categories** - Organize habits with custom colors and icons
- **GitHub-style Heatmap** - Visualize your progress over time
- **Statistics** - Completion rates, streaks, and detailed analytics per habit
- **REST API** - Full API access with OpenAPI documentation
- **API Key Auth** - Secure API access for external clients and automations
- **Multi-language** - English and German (i18n ready for more)
- **Dark Mode** - Built-in dark theme support
- **Mobile-friendly** - Responsive design for all devices
- **Self-hosted** - Your data stays on your server

## Roadmap

- [ ] Custom metadata fields for habits
- [ ] Import/Export functionality
- [ ] Webhook notifications
- [ ] Recurring reminders
- [ ] API key expiration & rotation
- [ ] Audit logging
- [ ] Structured JSON logging
- [ ] Multi-user support with invitations

## Screenshots

> *Screenshots coming soon*

## Installation

### Docker (Recommended)

Create a `docker-compose.yml`:

```yaml
name: habitwire

services:
  habitwire:
    image: civer/habitwire:latest
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=db
      - DB_NAME=habitwire
      - DB_USER=habitwire
      - DB_PASSWORD=change-me-db-password
      - NUXT_SESSION_PASSWORD=change-me-min-32-characters-long!
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    volumes:
      - data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=habitwire
      - POSTGRES_USER=habitwire
      - POSTGRES_PASSWORD=change-me-db-password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U habitwire"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  data:
```

> **First start:** Check container logs with `docker compose logs habitwire` to see the auto-generated admin password.

> **Tip:** You can also set `INITIAL_USER` and `INITIAL_PASSWORD` via a `.env` file or environment variables to define your own admin credentials on first startup.

Start the application:

```bash
docker compose up -d
```

Access HabitWire at `http://localhost:3000`

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_HOST` | Yes | - | PostgreSQL host |
| `DB_PORT` | No | 5432 | PostgreSQL port |
| `DB_NAME` | Yes | - | Database name |
| `DB_USER` | Yes | - | Database user |
| `DB_PASSWORD` | Yes | - | Database password |
| `NUXT_SESSION_PASSWORD` | Yes | - | Session encryption key (min 32 characters) |
| `INITIAL_USER` | No | admin | Initial admin username (first start only) |
| `INITIAL_PASSWORD` | No | *auto-generated* | Initial admin password (first start only) |
| `RATE_LIMIT_PER_MINUTE` | No | 1000 | API rate limit per minute |
| `RUN_MIGRATIONS` | No | true | Run database migrations on startup |

> **Note:** If `INITIAL_PASSWORD` is not set, a secure password is auto-generated and displayed in the container logs on first startup. Make sure to check the logs and change the password immediately.

Generate a secure session password:
```bash
openssl rand -base64 32
```

## Development

### Prerequisites

- Node.js 24+
- PostgreSQL 16+ (or Docker)
- npm

### Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/civer/habitwire.git
   cd habitwire
   ```

2. **Start the development database**
   ```bash
   cd dev
   cp docker-compose.example.yml docker-compose.yml
   # Edit docker-compose.yml with your credentials
   docker compose up -d
   cd ..
   ```

3. **Configure environment**
   ```bash
   cd src
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Install dependencies and start**
   ```bash
   npm install
   npm run db:migrate
   npm run dev
   ```

5. **Access the app** at `http://localhost:3000`

### Local Docker Build

Build and run HabitWire locally with Docker:

```yaml
# docker-compose.local.yml
name: habitwire

services:
  habitwire:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=db
      - DB_NAME=habitwire
      - DB_USER=habitwire
      - DB_PASSWORD=devpassword
      - NUXT_SESSION_PASSWORD=devsecret-minimum-32-characters-long
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    volumes:
      - data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=habitwire
      - POSTGRES_USER=habitwire
      - POSTGRES_PASSWORD=devpassword
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U habitwire"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  data:
```

```bash
docker compose -f docker-compose.local.yml up --build
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | [Nuxt 4](https://nuxt.com/) (Full-Stack) |
| Database | [PostgreSQL](https://postgresql.org/) + [Drizzle ORM](https://orm.drizzle.team/) |
| Auth (Web) | [nuxt-auth-utils](https://github.com/atinux/nuxt-auth-utils) (Sealed Cookies) |
| Auth (API) | API Keys (SHA-256 hashed) |
| UI | [Nuxt UI v3](https://ui.nuxt.com/) + [Tailwind CSS](https://tailwindcss.com/) |
| Charts | [ApexCharts](https://apexcharts.com/) |
| Validation | [Zod](https://zod.dev/) |
| i18n | [@nuxtjs/i18n](https://i18n.nuxtjs.org/) |

## API Documentation

HabitWire provides a full REST API with OpenAPI documentation.

- **Swagger UI**: `http://localhost:3000/api-docs`
- **OpenAPI Spec**: `http://localhost:3000/openapi.json`

### Authentication

**Web UI**: Uses secure HTTP-only session cookies.

**API Clients**: Use the `Authorization` header with an API key:
```
Authorization: ApiKey hw_your-api-key-here
```

API keys can be created in the Settings page of the web UI.

## Contributing

Contributions are welcome! This is a friendly open source project - be respectful, constructive, and patient with each other. Whether you're fixing a typo, reporting a bug, or proposing a new feature, your contribution is appreciated.

**Getting involved:**
- Report bugs or suggest features via GitHub Issues
- Submit pull requests (please describe your changes clearly)
- Help improve documentation or translations

### AI-Assisted Development

This project welcomes contributions developed with AI assistance (GitHub Copilot, Claude, ChatGPT, etc.). However, AI-generated code must meet the same quality standards as manually written code:

**Requirements for AI-assisted contributions:**

1. **Security** - Review AI-generated code for vulnerabilities (injection, XSS, auth issues, etc.)
2. **Documentation** - Ensure the AI has access to current project documentation and coding conventions
3. **Testing** - Verify that AI-generated code works correctly and doesn't break existing functionality
4. **Understanding** - You should understand what the code does before submitting it

**For larger AI-assisted changes:**

- Explain the scope of AI assistance in your PR description
- Document any architectural decisions made with AI help
- Ensure the AI was provided with up-to-date context (current codebase state, dependencies, conventions)

The goal is transparency and quality - not to discourage AI usage, but to ensure all contributions maintain the project's standards.

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).

---

**HabitWire** - Track your habits, own your data.
