---
name: Next development asset caching
description: Why development chunks must not use long-lived immutable caching in Replit preview.
---

In development, serve Next static chunks with `no-store`/`no-cache`; reserve long-lived immutable caching for production builds.

**Why:** Replit preview can retain a development chunk URL across restarts. An immutable one-year cache mixed stale client JavaScript with fresh server HTML, producing hydration/runtime crashes and stale UI after valid source changes.

**How to apply:** Any cache-header changes for `/_next/static/*` must branch on the environment. After changing client code, verify the development chunk response is not immutable.

Do not override Next.js development `splitChunks` to extract React/framework packages.

**Why:** Custom framework/vendor chunk groups caused Fast Refresh to load inconsistent React module factories across route transitions, producing invalid-hook-call and undefined webpack factory crashes.

**How to apply:** Let Next.js control development chunking. If production chunk optimization is ever needed, scope it strictly to production and verify client-side navigation across several routes.

Do not run `next build` concurrently with a live `next dev` process when both use the same `.next` directory.

**Why:** The production build can replace or remove development manifests and chunks while the dev server is serving requests, causing missing-module and missing-manifest 500 responses until the generated directory is cleared and development restarts.

**How to apply:** Stop the development workflow before a production build, or isolate the build output. After any accidental overlap, clear only the generated `.next` directory and restart the workflow once.