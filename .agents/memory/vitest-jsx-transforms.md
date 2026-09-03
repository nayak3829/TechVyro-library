---
name: Vitest JSX transforms
description: How to run TSX component tests when the Next.js TypeScript configuration preserves JSX.
---

When Vitest 4 uses Vite's OXC transformer in a Next.js project whose TypeScript config sets JSX to `preserve`, set the Vitest `oxc.jsx` option to `react-jsx`. Do not rely on the older `esbuild.jsx` option.

**Why:** Vite's import analysis otherwise receives untransformed JSX and fails before tests load; Vitest 4 reports that OXC takes precedence and ignores simultaneous esbuild settings.

**How to apply:** Use this only for Vitest component tests in projects that preserve JSX for Next.js. Keep the application TypeScript setting unchanged.