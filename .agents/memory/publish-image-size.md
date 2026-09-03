---
name: Publish image size
description: Replit publish image-size constraint and source-exclusion rule for this project.
---

Keep generated dependencies, Next output, package stores, test browsers, caches, and agent/runtime state out of the publish source.

**Why:** A valid production build failed after compilation because accumulated workspace state made the final image exceed Replit's 8 GiB layer limit. Git ignore rules did not prevent that state from entering the publish process.

**How to apply:** Maintain the dedicated publish ignore file, and treat local package stores, browser binaries, stale package backups, Next caches, and test output as disposable when investigating future image-size failures.