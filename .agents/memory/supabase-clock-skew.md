---
name: Supabase clock-skew retries
description: How to handle transient JWT-issued-in-the-future failures during Replit cold starts.
---

Retry a server-side Supabase read once, after a short bounded delay, only when the provider explicitly reports `JWT issued at future`.

**Why:** During a Replit cold start, a service-role settings read was briefly rejected for clock skew and succeeded immediately afterward. Logging the first transient as a permanent settings failure created a false runtime alarm.

**How to apply:** Keep the retry narrow to this exact authentication error, use one short delay, and surface/log the second failure normally. Never broadly retry authorization failures.