---
name: Publish image size
description: Replit publish image-size constraint and source-exclusion rule for this project.
---

Keep generated dependencies, Next output, package stores, test browsers, caches, and agent/runtime state out of the publish source. Copy the final Next standalone runtime to a small, non-ignored deployment directory before deleting build dependencies and `.next`.

**Why:** A valid production build once exceeded Replit's 8 GiB layer limit. A later build compiled successfully but crash-looped because its run command targeted `.next/standalone/server.js`, which was absent from the packaged runtime.

**How to apply:** Maintain the dedicated publish ignore file, assemble and size-check the standalone server/static/public bundle outside `.next`, run production from that bundle, and treat local package stores, browser binaries, stale package backups, Next caches, and test output as disposable.