# TechVyro PDF Library

A Next.js 15 PDF library and quiz platform with admin dashboard, user accounts, AppX test extractor, and smart student features. Hosted on Replit with Supabase backend.

## AppX Test Extractor
Full integration of test-series extraction from 9686 APX platforms:
- **`/extract`** — Search-driven UI; autocomplete from `lib/appx-platforms.json` (9686 platforms); popular platforms grid
- **`/extract/series`** — Shows real live test titles from classx.co.in scraping; no login/credits required to play
- **`/extract/play`** — Plays test using `QuizPlayer` component (timer, scoring, explanations)
- **`/api/extract/route.ts`** — Parallel fetch with `__NEXT_DATA__` scraping; `deriveWebUrl()` converts API→web URL; sample fallback
- **`/api/extract/tests/route.ts`** — Fetches real tests by series slug from classx.co.in; handles `sample:` prefix
- **`/api/extract/questions/route.ts`** — Parallel 3s timeout on 7 endpoints → category-based sample fallback when live fails
- **`/api/extract/search/route.ts`** — Searches appx-platforms.json by platform name for autocomplete
- **`lib/appx-platforms.json`** — 9686 classx.co.in/appx.co.in platforms with API URLs
- **`lib/sample-tests.ts`** — Sample questions for NDA, JEE, SSC, Banking, Railways, CTET; `mapUrlToCategory()` and `getSampleSeriesForCategory()`

### New APIs (March 2026)
- **`/api/platforms/search`** — Fast search across all 9686 APX platforms; returns name, api, web URL; supports `?q=query&limit=n`
- **`/api/quiz-html`** — Serves fully self-contained quiz HTML page using `public/quiz-template.html` template; fetches raw questions from APX API (option_1/option_2 format); falls back to 25 sample questions; params: `testId`, `apiBase`, `title`, `seriesTitle`, `duration`
- **`public/quiz-template.html`** — 2208-line Bootstrap quiz UI template with timer, submit, score analysis; placeholders: `{json_data}`, `{test_time}`, `{test_name}`, `{test_series_name}`, `{website_url}`

### /test-series Page (Updated)
- Platform search autocomplete bar at top — searches all 9686 platforms in real time
- When a platform is selected, fetches its specific test series via `/api/extract`
- Each series card has two buttons: **Browse** (series list) and **Quiz** (opens quiz HTML in new tab)
- Category filter pills + text search work as before for bulk discovery mode

### Live Extraction Status
- **Test series titles**: Work live from classx.co.in via `__NEXT_DATA__` scraping (~1.6s)
- **Questions**: Require platform login (404 without auth) → category-based sample fallback served instantly
- **No credits/login required** to play any test; all tests use sample questions as fallback
- Major platforms (CareerWill, PW, Adda247, ExamPur): Not in classx.co.in DB → sample mode only

## Student Features (v2)
- **User Accounts**: Supabase Auth (email/password) — Login/Signup modal in header (`components/auth-modal.tsx`, `hooks/use-auth.ts`)
- **Recently Viewed**: localStorage-based horizontal scroll section on homepage (`components/home/recently-viewed-section.tsx`) — auto-saved when any PDF is opened
- **Related PDFs**: Same-category PDFs shown at bottom of each PDF view page (server-side fetch in `app/pdf/[id]/page.tsx`)
- **Reading Progress**: Live timer tracks time spent on each PDF — shown as badge and in sidebar stats
- **Bookmark**: Heart icon on PDF page saves/removes bookmark — stored in localStorage (`techvyro_bookmarks`)
- **Quiz History**: All quiz attempts saved to localStorage (`techvyro_quiz_history`) — shown in `/quiz` page (`components/quiz-history-section.tsx`)
- **Content Structure Sidebar**: Testbook-style auto content tree on `/quiz` page (`components/quiz/quiz-content-structure.tsx`) — shows Folder→Category→Section hierarchy, only displays nodes that have quizzes linked via `structure_location`, clicking any node filters the quiz list; mobile-friendly collapsible
- **About/Contact Page**: Full page at `/about` with mission, stats, features, and contact info
- **Footer Quick Links**: About Us + Quiz Portal added to footer navigation

## Design System (Advanced Level)
All public pages follow a consistent premium design language:
- Gradient hero banners with grid texture overlay and blur orbs
- Color-coded category/subject accents pulled from database
- `no-scrollbar` utility for horizontal scroll containers
- `rounded-2xl`/`rounded-3xl` card shapes with glassmorphism borders
- Top color-accent bars on cards (1.5px gradient strips)
- Conic-gradient score rings on quiz results
- Podium visualization on leaderboard (gold/silver/bronze)
- Mobile-first: full-width CTAs, horizontal-scrollable filter chips
- **Responsive breakpoints**: hero grid activates at `md` (768px), not `lg`; featured cards go 4-col at `md`; stats bottom row side-by-side at `md`
- `pb-20 md:pb-0` wrapper in `app/layout.tsx` ensures mobile nav (60px) never overlaps content

## Tech Stack
- **Framework**: Next.js 16.1.6 (App Router, Turbopack)
- **Package Manager**: pnpm
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript

## Run Command
```
pnpm run dev
```
Port: 5000

## API-Based Content Management

All website content is controlled via the admin panel and stored in Supabase `site_settings`:

| Setting Key | Controls |
|-------------|---------|
| `general_settings` | Site name, tagline, contact email, main website URL, all social media URLs (Instagram, Facebook, WhatsApp, Telegram), WhatsApp popup on/off |
| `hero_settings` | Rotating taglines, trust stat badges, badge text, hero description, button labels |
| `testimonials` | Testimonials list (enabled/disabled) |
| `watermark` | PDF watermark config |
| `security` | Download rate limits |

Components that fetch from API:
- `components/footer.tsx` — fetches `general_settings` for social links, contact info
- `components/home/hero-section.tsx` — fetches `hero_settings` + `general_settings` + `/api/stats/summary` for real PDF count, downloads, views, and recent PDF cards
- `components/whatsapp-popup.tsx` — fetches `general_settings` for channel URL and popup toggle
- `app/page.tsx` — fetches `general_settings` for bottom CTA WhatsApp link
- `components/header.tsx` — fetches `/api/categories` for dynamic search suggestions; live PDF search via `/api/pdfs/search` with 300ms debounce

## Architecture

### Admin Authentication
- Password stored in `ADMIN_PASSWORD` environment secret
- Login creates a base64-encoded token stored in `sessionStorage`
- All admin API routes verify the token via `Authorization: Bearer <token>` header

### Database Tables (Supabase)
| Table | Purpose |
|-------|---------|
| `pdfs` | PDF documents with metadata |
| `categories` | PDF categories |
| `reviews` | User reviews for PDFs |
| `quizzes` | Quiz data (JSON) |
| `quiz_results` | Quiz attempt results / leaderboard |
| `site_settings` | Key-value store for app settings (JSONB) |

### `site_settings` Keys
| Key | Content |
|-----|---------|
| `folders` | Content folder/category/section hierarchy |
| `featured_pdfs` | Featured PDF IDs for homepage |
| `announcements` | Homepage announcement banners |
| `hero_settings` | Homepage hero section config |
| `testimonials` | Testimonial array for homepage |
| `general_settings` | Site name, watermark, security, notification prefs |

### API Routes
| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/pdfs` | GET/POST | POST needs admin | List/create PDFs |
| `/api/pdfs/[id]` | GET/PUT/DELETE | PUT/DELETE admin | PDF CRUD |
| `/api/categories` | GET/POST/DELETE | POST/DELETE admin | Category CRUD |
| `/api/reviews` | GET/POST/DELETE | DELETE admin | Review management |
| `/api/quizzes` | GET/POST | POST admin | Quiz management |
| `/api/quiz-results` | GET/POST/DELETE | DELETE admin | Leaderboard |
| `/api/folders` | GET/PUT | PUT admin | Folder structure |
| `/api/site-settings` | GET/PUT | PUT admin | App settings |
| `/api/admin/login` | POST | — | Admin auth |
| `/api/admin/verify` | GET | Admin | Token verify |
| `/api/upload` | POST | Admin | PDF file upload |
| `/api/stats` | GET | — | Dashboard stats |
| `/api/stats/summary` | GET | — | Aggregate stats (pdfs, downloads, views, recent/popular PDFs) |
| `/api/pdfs/search` | GET | — | Live PDF title search with `?q=` and `?limit=` params |
| `/api/ai/generate-summary` | POST | Admin | AI-generated PDF description (GPT-3.5-turbo) |
| `/api/ai/generate-quiz` | POST | Admin | AI-generated quiz questions (GPT-4o-mini) |

### AI Features
- **AI PDF Summary** (`/api/ai/generate-summary`): Takes PDF title, description, category → returns a 2-3 sentence student-friendly description via GPT-3.5-turbo. Button appears in the PDF upload form's "Advanced Options" section next to the description textarea.
- **AI Quiz Generator** (`/api/ai/generate-quiz`): Takes topic, category, count (3-20), difficulty → returns a full quiz JSON (title, description, questions with options + explanations) via GPT-4o-mini. Button "Generate with AI" appears in Quiz Manager action bar.

### Telegram Notifications
- **Helper**: `lib/telegram.ts` — reads `telegramChatId` from `general_settings` in `site_settings`, sends message via Bot API (fire and forget).
- **New PDF Alert**: Fired from `/api/pdfs/save-metadata` after successful insert (not on replace). Includes title, category name, file size, IST timestamp.
- **Quiz Result Alert**: Fired from `/api/quiz-results` POST after result saved. Includes student name, quiz title, score/percentage, time taken.
- **Config**: Admin sets `telegramChatId` in Admin > Settings > Notifications. Bot token comes from `TELEGRAM_BOT_TOKEN` env secret.

### Admin Power Tools (Added March 2026)
- **`/admin` → "Power Tools" tab** — New AI-powered tab in the admin sidebar
- **Content Health Dashboard**: Shows health score (0-100), PDFs missing description/category/tags, visibility breakdown (public/unlisted/private)
- **AI Batch Enhancement**: One-click AI generation of descriptions and tags for all PDFs (up to 30/run) using GPT-4o mini. Modes: descriptions only, tags only, or both.
- **Export PDF Catalog**: Download full PDF library as CSV or JSON with all metadata fields
- **Bulk Visibility Control**: Change visibility of all/private/unlisted PDFs in one click
- **Action Items Widget**: Automatically highlights what needs fixing with direct "Fix with AI" buttons
- **`/api/pdfs/batch-ai`** — GET (health stats), POST (batch AI), PATCH (bulk visibility)
- **`/api/pdfs/[id]`** — Enhanced to support `visibility`, `tags`, `allow_download` in PATCH updates

### Enhanced PDF List (March 2026)
- **Full inline editing**: Edit title, category, description, tags, visibility, allow_download in one panel
- **Visibility badge**: PDFs with private/unlisted status show a color-coded badge in the list
- **Quick toggle**: Click the visibility badge to cycle through public → private → unlisted
- **Tags display**: Tags shown in the PDF row for at-a-glance info
- **Description preview**: First line of description visible in the list

### Test-Series Powerful Enhancements (March 2026)
- **`/test-series`** — Main page major improvements:
  - **Quick Practice button**: Randomly pick and launch a practice test with one click
  - **Sort controls**: Sort by Default / Shortest Duration / Most Questions
  - **Grid/List toggle**: Switch between card grid and compact list view
  - **Popular Platforms**: Quick-access chips for Parmar Academy, SSC Pinnacle, Oliveboard, Adda247, Wifistudy, Testbook, Drishti IAS, etc.
  - **Recently Visited**: localStorage-based recent platform chips for quick re-access
  - `saveRecentPlatform()` — saves to `techvyro_recent_platforms` in localStorage
- **`/test-series/series`** — Complete redesign matching quiz UI/UX:
  - **Gradient hero header**: Series stats (tests, subjects, questions, free count, attempted count)
  - **Progress bar**: Visual completion % based on localStorage attempt tracking
  - **Sticky controls bar**: Search tests, Free/Paid filter, Sort by (Default/Shortest/Longest/Most Questions), Grid/List toggle
  - **Expand all / Collapse all**: One-click expand for all subject accordions
  - **TestCard (grid view)**: Rich card showing title, free badge, attempt count, duration, questions, marks
  - **TestRow (list view)**: Compact row with attempted checkmark, "Retry" vs "Start" button
  - **Attempt tracking**: Uses `techvyro_test_attempts` localStorage key — counts per testId
  - **Start First Test button** in header for instant access
  - **Login prompt** for non-sample (live) test series

### Key Components
- `app/admin/page.tsx` — Admin dashboard with tabs (now includes Power Tools)
- `components/admin/tools-manager.tsx` — Power Tools: AI batch, health dashboard, export, bulk visibility
- `components/admin/pdf-list.tsx` — Enhanced with full inline editing and visibility controls
- `components/admin/folder-manager.tsx` — Manage content folder hierarchy
- `components/admin/homepage-manager.tsx` — Featured PDFs, announcements, hero, testimonials
- `components/admin/site-settings.tsx` — General site settings
- `components/admin/quiz-manager.tsx` — Quiz CRUD
- `components/home/categories-section.tsx` — Homepage folder/category display
- `components/home/testimonials-section.tsx` — Homepage testimonials

## Secrets Required
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — For server-side DB access
- `NEXT_PUBLIC_SUPABASE_URL` — For client-side
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — For client-side
- `ADMIN_PASSWORD` — Admin panel password
- `OPENAI_API_KEY` — For AI features
- `TELEGRAM_BOT_TOKEN` — For Telegram notifications

## Migration Scripts
| Script | Purpose |
|--------|---------|
| `scripts/001_*.sql` | Initial tables |
| `scripts/002_*.sql` | Reviews table |
| `scripts/003_*.sql` | Additional schema |
| `scripts/004_create_quiz_tables.sql` | Quizzes and quiz_results |
| `scripts/005_create_site_settings.sql` | site_settings table |
