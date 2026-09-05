---
name: Lighthouse metadata verification
description: How to handle Lighthouse 13 falsely reporting missing Next App Router metadata.
---

Do not rewrite valid metadata solely because Lighthouse 13 reports an App Router meta description as absent. First verify the production response HTML and the hydrated browser DOM.

**Why:** A release audit repeatedly reported no description while both the raw document and Playwright contained exactly one non-empty description tag.

**How to apply:** Treat the audit as a tool false negative only when independent HTML and runtime-DOM checks agree; continue to fix any real canonical, robots, Open Graph, or structured-data failures.