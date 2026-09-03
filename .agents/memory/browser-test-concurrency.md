---
name: Browser test concurrency
description: Reliable Playwright execution when Next development routes compile on demand.
---

Run navigation-heavy Playwright suites with a single worker when they exercise several cold routes against the local Next development server.

**Why:** Parallel browser workers can trigger multiple route and API compilations at once. Requests then stall for tens of seconds and Playwright reports missing controls, closed sessions, or navigation timeouts even though the same flows pass sequentially.

**How to apply:** Use one worker for focused navigation suites and allow combined multi-route tests a longer total timeout. Treat parallel-only failures as inconclusive until the same scenario is checked sequentially.