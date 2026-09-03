---
name: Canonical pnpm lock handling
description: Prevent mixed lockfiles from selecting npm and leaving stale dependency links in a running Next process.
---

When a project declares pnpm in `packageManager`, keep `pnpm-lock.yaml` canonical rather than retaining an npm lockfile that can cause package automation to select npm.

**Why:** A mixed-lock install updated only npm metadata; switching back to pnpm then rewired dependencies while Next was running, producing transient missing-module errors from stale links.

**How to apply:** Use Replit package management with the canonical lockfile, remove conflicting secondary lockfiles, and restart the application workflow once after dependency/lockfile changes.