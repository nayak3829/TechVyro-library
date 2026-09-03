---
name: Supabase auth session architecture
description: Session-storage and route-guard constraints for reliable browser/server authentication.
---

Use the Supabase SSR browser client so browser login, server callbacks, middleware, and server APIs all read and write the same cookie-backed session.

**Why:** A plain browser client persisted sessions in local storage while server auth expected cookies. Login appeared successful client-side, but protected server routes and password-recovery callbacks could not reliably see the session.

**How to apply:** Keep browser and server clients on the SSR integration, and verify login by passing browser-produced cookies through an authenticated server route.

This project uses Next.js 15, so route protection must use the `middleware.ts` convention.

**Why:** A newer `proxy.ts` convention compiled as an ordinary unused file under Next.js 15, leaving protected routes publicly renderable.

**How to apply:** After framework upgrades, confirm the active request-interception convention against the installed Next.js version and test an anonymous protected-route request.