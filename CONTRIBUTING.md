# Contributing to HabitWire

Thank you for your interest in contributing to HabitWire! This document explains our development workflow. If you have suggestions for improving this process, feel free to open an issue for discussion.

## Branch Strategy

```
main                    Production (protected)
└── X.Y.Z               Version branch (e.g., 0.9.3)
    ├── feat/*          New features
    ├── fix/*           Bug fixes
    └── ci/*            CI/tooling changes
```

### Recommended Workflow

The general idea is to collect changes in version branches before releasing to main:

1. **Fork the repository** (for external contributors)
2. **Create a feature branch** based on the current version branch
3. **Open a Pull Request** to the version branch
4. **Maintainers review and merge** when CI passes

For urgent fixes, hotfix branches can go directly to main - but this should be rare.

## Getting Started

```bash
# Fork and clone
git clone https://github.com/YOUR-USERNAME/habitwire.git
cd habitwire

# Add upstream remote
git remote add upstream https://github.com/civer/habitwire.git

# Create feature branch from version branch
git fetch upstream
git checkout -b feat/my-feature upstream/0.9.3
```

## Making Changes

1. **Commit using [Conventional Commits](https://www.conventionalcommits.org/):**
   ```
   feat: add new feature
   fix: resolve bug in component
   docs: update README
   ```

2. **Run checks before pushing:**
   ```bash
   cd src
   npm run lint
   npm run typecheck
   npm run test:run
   ```

3. **Push and create PR:**
   ```bash
   git push -u origin feat/my-feature
   ```

## Development Setup

```bash
# Start development database
cd dev && docker compose up -d && cd ..

# Install and run
cd src
npm install
npm run dev          # http://localhost:3000
```

## Code Style

- TypeScript with strict mode
- Vue 3 Composition API (`<script setup>`)
- All UI text via i18n (English + German)

## Release Process

Releases are handled by maintainers:
1. Version branch → main (via PR)
2. Tag `vX.Y.Z` → Docker build triggers automatically

## Questions?

Open an issue or start a discussion - we're happy to help!
