# TechVyro PDF Library

A Next.js 16 PDF library and quiz platform with admin dashboard, hosted on Replit with Supabase backend.

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

### Key Components
- `app/admin/page.tsx` — Admin dashboard with tabs
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
