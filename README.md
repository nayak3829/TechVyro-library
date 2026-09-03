# TechVyro Library

TechVyro Library is a full-stack educational resource platform built with Next.js and Supabase. It brings PDFs, structured subjects, quizzes, mock tests, user profiles, reviews, analytics, and administrative content management into one responsive application.

The platform is designed for students who need a searchable study library and for administrators who need secure tools to upload, organize, publish, and monitor educational content.

## Contents

- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Application Areas](#application-areas)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Supabase Setup](#supabase-setup)
- [Development Commands](#development-commands)
- [Testing](#testing)
- [PDF Processing](#pdf-processing)
- [Quiz Import System](#quiz-import-system)
- [Security](#security)
- [Publishing on Replit](#publishing-on-replit)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

## Key Features

### Study Library

- Browse and search educational PDFs
- Filter material by category, subject, folder, and section
- SEO-friendly PDF detail pages
- View and download tracking
- Favorites for signed-in users
- Ratings and authenticated reviews
- Related and recently uploaded resources
- Private PDF storage with policy-aware thumbnail and download routes

### Structured Content

- Hierarchical folder, category, and section organization
- Automatic content placement from imported metadata
- Subject and category landing pages
- Exact public catalogue statistics
- Bulk content movement and management

### Quiz and Mock-Test Platform

- Public quiz catalogue
- Timed quizzes and mock tests
- Multiple-choice, multi-select, and true/false questions
- Difficulty, passing percentage, marks, and negative-marking settings
- Question and option shuffling
- Quiz results and leaderboard
- JSON, HTML, pasted HTML, and AI-assisted quiz imports
- Duplicate detection and preflight validation before import

### Authentication and Profiles

- Supabase authentication
- Email/password and configured OAuth provider support
- SSR-compatible cookie sessions
- Password reset flow
- User profile management
- Authenticated favorites, reviews, and quiz history

### Administration

- Password-protected administrative dashboard
- PDF upload and publishing tools
- Smart PDF analysis and metadata extraction
- Category, folder, and content-structure management
- Quiz creation, editing, bulk import, and conflict handling
- Homepage and site settings
- Review moderation
- Activity logs and real analytics
- Telegram-assisted support and notifications

### User Experience

- Responsive desktop and mobile layouts
- Light and dark themes
- Accessible controls and semantic navigation
- Optimized Next.js images and caching
- Replit Preview compatibility
- Security headers and safe external-link handling

## Technology Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 15 App Router |
| Language | TypeScript |
| UI | React 19, Tailwind CSS 4, Radix UI |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth with SSR cookies |
| File Storage | Supabase Storage |
| Forms and validation | React Hook Form, Zod, canonical server validation |
| PDF tools | PDF.js, PDF-Lib, Sharp, Tesseract.js |
| Charts and analytics | Recharts |
| Unit/integration testing | Vitest, Testing Library |
| Browser testing | Playwright |
| Package manager | pnpm 9 |
| Hosting | Replit Autoscale/Reserved VM compatible |

## Application Areas

### Public Routes

| Route | Purpose |
| --- | --- |
| `/` | Homepage, featured content, subjects, statistics, and discovery |
| `/browse` | Searchable PDF catalogue |
| `/category/[slug]` | Category-specific resources |
| `/subject/[id]` | Structured subject content |
| `/pdf/[id]` | PDF details, reviews, views, and downloads |
| `/quiz` | Quiz portal |
| `/quiz/[id]` | Quiz player |
| `/quiz/leaderboard` | Quiz leaderboard |
| `/test-series` | Mock-test discovery |
| `/test-series/series` | Test-series details |
| `/test-series/play` | Test player |
| `/profile` | User profile, activity, and saved content |
| `/login` | Authentication |
| `/about`, `/privacy`, `/terms` | Informational and policy pages |

### Administrative Route

`/admin` contains the protected management interface for:

- PDFs and uploads
- Categories and folders
- Content structure
- Quizzes
- Homepage content
- Reviews
- Site settings
- Analytics
- Activity logs
- Administrative tools

## Architecture

TechVyro uses the Next.js App Router with server and client components:

```text
Browser
  |
  |-- Next.js pages and React components
  |
  |-- /api routes
        |
        |-- Supabase Auth
        |-- PostgreSQL + Row Level Security
        |-- Supabase Storage
        |-- Telegram integration
        |-- Optional AI provider
```

Important architectural rules:

1. Public clients use the Supabase anonymous key and database RLS.
2. Privileged server operations use the service-role key only on the server.
3. Admin routes require a signed administrative session.
4. Private storage paths are never returned as public object URLs.
5. Quiz and PDF payloads are validated before database writes.
6. Aggregate homepage statistics are calculated in PostgreSQL rather than from a bounded card list.

## Getting Started

### Prerequisites

- Node.js 20 or newer
- pnpm 9.15.0
- A Supabase project
- A PostgreSQL database provided by Supabase

Optional integrations:

- Telegram bot for support notifications
- OpenAI-compatible key for AI features
- Upstash Redis/KV for distributed rate limits or caching

### 1. Clone the repository

```bash
git clone https://github.com/nayak3829/TechVyro-library.git
cd TechVyro-library
```

### 2. Install dependencies

```bash
pnpm install --frozen-lockfile
```

### 3. Configure environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Replace every placeholder with credentials from your own services. Never commit `.env.local`, service-role keys, passwords, tokens, or session secrets.

### 4. Configure Supabase

Apply the SQL scripts described in [Supabase Setup](#supabase-setup), then configure the required storage bucket and authentication providers.

### 5. Start development

```bash
pnpm dev
```

The application listens on:

```text
http://localhost:5000
```

## Environment Variables

### Required

| Variable | Scope | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anonymous/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Privileged Supabase key for trusted API routes |
| `ADMIN_PASSWORD` | Server only | Password used to establish an admin session |
| `SESSION_SECRET` | Server only | Long, random secret used to sign server sessions |
| `NEXT_PUBLIC_SITE_URL` | Public | Canonical published application URL |

### Optional

| Variable | Description |
| --- | --- |
| `OPENAI_API_KEY` | Enables configured AI chat, summary, or quiz-generation features |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for support and notification features |
| `BOT_TOKEN`, `TELEGRAM_TOKEN` | Compatibility aliases used by selected Telegram tooling |
| `KV_REST_API_URL` | Upstash Redis/KV REST endpoint |
| `KV_REST_API_TOKEN` | Upstash Redis/KV REST token |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION_CODE` | Google site-verification value |

### Secret-handling rules

- Variables beginning with `NEXT_PUBLIC_` are sent to the browser.
- Never place a service-role key, admin password, session secret, or bot token in a `NEXT_PUBLIC_` variable.
- Keep development and production secrets synchronized through the hosting provider's secret manager.
- Rotate any credential that has accidentally been committed or printed.

## Supabase Setup

Database setup and migrations live in `scripts/`.

For an existing installation, apply numbered migrations in ascending order and only apply scripts that have not already been executed:

```text
001_create_tables.sql
002_add_view_count.sql
003_add_reviews.sql
...
028_public_pdf_stats.sql
```

The migrations cover:

- Core PDF and category tables
- Views, downloads, favorites, and reviews
- Quiz definitions and results
- Site and homepage settings
- Content-structure locations
- User ownership
- Credits and referrals
- Private PDF storage
- Row Level Security hardening
- Admin chat and activity logs
- Analytics
- PDF-processing jobs
- Public aggregate statistics

### Important

- Review SQL before executing it against an existing production database.
- Apply migrations using the Supabase SQL editor or your controlled migration process.
- Do not expose the service-role key to the browser.
- Keep RLS enabled on user-facing tables.
- Use a private storage bucket for protected PDFs.

## Development Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start Next.js development server on port 5000 |
| `pnpm build` | Create an optimized production build |
| `pnpm start` | Run the production server on port 5000 |
| `pnpm test` | Run the Vitest suite |
| `pnpm test:e2e` | Run Playwright browser tests |
| `pnpm test:e2e:prod` | Build and run Playwright against production mode |
| `pnpm pdf-worker:once` | Process one pass of queued PDF jobs |
| `pnpm exec tsc --noEmit` | Run TypeScript validation |

## Testing

The repository includes:

- Unit tests for validation and utility logic
- API route authorization and behavior tests
- Supabase and storage-access tests
- PDF processing and upload-queue tests
- Quiz import and structure-matching tests
- Middleware and authentication tests
- Playwright browser tests for important user flows

Run the standard checks:

```bash
pnpm exec tsc --noEmit
pnpm test
pnpm test:e2e
```

Run a focused test:

```bash
pnpm exec vitest run tests/quiz-validation-and-html.test.ts
```

Navigation-heavy Playwright suites should run with conservative concurrency because multiple simultaneous cold Next.js compilations can create false timeouts.

## PDF Processing

The PDF pipeline supports:

- File validation and duplicate checks
- Signed direct-to-storage uploads
- Metadata extraction
- Smart categorization
- OCR-assisted analysis
- Thumbnail generation
- Processing-job retries and bounded attempts
- Watermarked downloads
- Private access checks

Queued jobs can be processed once with:

```bash
pnpm pdf-worker:once
```

Production environments that require continuous background processing should use an appropriate worker or scheduled process rather than relying on in-memory work inside an autoscaled web request.

## Quiz Import System

The admin quiz manager supports:

- JSON file imports
- HTML file imports
- Pasted HTML
- AI-assisted generation
- Manual quiz CRUD
- Bulk settings and conflict decisions

Import behavior follows these rules:

1. Embedded quiz metadata is preserved.
2. Inferred structure placement is applied when a matching category exists.
3. Explicit admin settings override imported values.
4. Every final payload is preflight validated.
5. Existing and same-batch duplicate titles are detected.
6. Invalid or duplicate items are automatically excluded with a visible explanation.
7. Copy imports receive collision-free titles.
8. The server revalidates content-structure relationships before saving.

Current client limits:

- Maximum 50 files in one import batch
- Maximum 2 MiB per import file
- Between 1 and 500 questions per quiz

## Security

Security controls include:

- Signed admin sessions
- Server-only privileged credentials
- Supabase SSR authentication cookies
- Row Level Security policies
- Private PDF storage routes
- Authenticated review identity
- Payload validation and sanitization
- Quiz-answer protection
- Rate-limiting support
- Content Security Policy
- `X-Content-Type-Options`
- Referrer and Permissions policies
- Activity and analytics audit trails

Before publishing:

```bash
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

Also confirm:

- Production environment variables are configured
- Supabase redirect URLs include the published domain
- RLS policies and migrations are applied
- The PDF bucket remains private
- No `.env` files or credentials are tracked
- Admin and Telegram credentials are rotated when ownership changes

## Publishing on Replit

The project is configured as a dynamic Next.js application:

```text
Build command: pnpm run build
Run command:   pnpm run start
Port:          5000
```

The `.replitignore` file prevents generated development data from entering the publish source, including:

- `node_modules`
- `.next`
- local package stores
- browser-test binaries
- test output
- agent/runtime state

This is important because local caches can otherwise make the final deployment image exceed the hosting size limit.

After changing production configuration:

1. Run TypeScript and tests.
2. Confirm `pnpm build` completes.
3. Publish from Replit.
4. Verify `/`, `/admin`, and `/api/quizzes`.
5. Check publishing logs for startup or health-check failures.

## Project Structure

```text
TechVyro-library/
├── app/                    # Next.js pages, layouts, and API routes
│   ├── admin/              # Protected admin application
│   ├── api/                # Server API endpoints
│   ├── auth/               # Authentication callback
│   ├── browse/             # PDF catalogue
│   ├── pdf/                # PDF details
│   ├── profile/            # User profile
│   ├── quiz/               # Quiz portal and player
│   └── test-series/        # Mock-test experience
├── components/
│   ├── admin/              # Admin managers and upload tools
│   ├── home/               # Homepage sections
│   └── ui/                 # Reusable UI primitives
├── hooks/                  # Shared React hooks
├── lib/                    # Auth, validation, storage, jobs, and utilities
├── public/                 # Static public assets
├── scripts/                # SQL migrations and maintenance scripts
├── tests/                  # Unit and integration tests
├── e2e/                    # Playwright browser tests
├── middleware.ts           # Session refresh and route middleware
├── next.config.mjs         # Next.js, security headers, and redirects
├── playwright.config.ts    # Browser-test configuration
├── vitest.config.mts       # Vitest configuration
└── .replit                 # Replit workflow and publish configuration
```

## Troubleshooting

### The app works locally but not after publishing

- Check production environment-variable names.
- Verify the build and run commands.
- Ensure the server listens on `0.0.0.0:5000`.
- Check publishing build and runtime logs.
- Confirm the root route returns HTTP 200.

### Supabase authentication redirects incorrectly

- Set `NEXT_PUBLIC_SITE_URL` to the published URL.
- Add local and production callback URLs to Supabase Auth settings.
- Confirm browser and server clients share SSR cookies.

### PDFs or thumbnails return unauthorized

- Confirm the user is allowed to access the PDF.
- Keep the storage bucket private.
- Request thumbnails and downloads through application API routes rather than raw storage paths.

### A quiz import is rejected

- Read the per-item warning shown in the import preview.
- Check duplicate titles, duplicate question IDs, options, and correct answers.
- Confirm the selected folder/category/section relationship still exists.
- Reduce the file count or file size when exceeding import limits.

### Replit reports an image larger than 8 GiB

- Keep `.replitignore` intact.
- Remove disposable `.next`, package-manager, browser-test, and local cache directories.
- Do not store uploaded PDFs or generated binaries in the workspace.
- Use Supabase Storage or another object-storage service for uploaded content.

---

Built for organized learning, secure content delivery, and scalable educational resource management.