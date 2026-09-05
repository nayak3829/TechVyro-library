---
name: Next build isolation
description: Prevent Next development and production builds from corrupting their shared output directory.
---

Never run `next build` in the workspace while the managed `next dev` workflow is active and both use the default `.next` directory. Stop development first or build from an isolated temporary source copy.

**Why:** Concurrent dev/build processes delete and replace each other's manifests and standalone output. This can create false missing-page build errors, crash the preview, and briefly produce missing `standalone/server.js` runtime starts even though the application code is valid.

**How to apply:** Prefer an isolated copy that excludes `.git`, `.next`, and `node_modules`, then symlink the existing `node_modules` and build there. On this Nix workspace, use `tar` rather than assuming `rsync` exists. Restart the managed workflow after any accidental in-place build.