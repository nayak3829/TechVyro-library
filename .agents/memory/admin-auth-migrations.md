---
name: Admin authentication migrations
description: Invariants for changing how admin sessions are transported across UI, APIs, and integrations.
---

When changing admin session transport, migrate every privileged API route, admin-presence hook, login/verification/logout path, and external integration callback as one compatibility unit.

**Why:** A partial move from JavaScript bearer tokens to an HttpOnly cookie left valid admins able to open the dashboard while core folder, settings, quiz, AI, and integration actions still rejected them. The breakage looked like unrelated CRUD failures.

**How to apply:** Search the full API surface for manual Authorization parsing and password comparisons, standardize on one cookie-aware verifier, and test representative read/write operations plus login, reload, and logout before removing the legacy transport.