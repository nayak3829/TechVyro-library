---
name: Smart upload concurrency
description: Why Smart PDF analysis and uploads use a bounded continuous worker pool rather than unlimited Promise.all concurrency.
---

Run Smart PDF analysis and storage uploads through a continuous worker pool capped at six concurrent files. A free slot should immediately take the next queued file; do not restore fixed batches of three or use unbounded `Promise.all`.

**Why:** Each file can create PDF.js rendering work, an OCR worker, thumbnail canvases, hashing buffers, and multiple network requests. Unlimited concurrency can exhaust browser memory/CPU and make the queue slower or crash the admin tab, while the old three-file fixed batches left capacity idle between batches.

**How to apply:** Preserve per-file and Cancel All abort propagation through analysis, OCR, API fetches, and signed storage XHR. Permanent client/duplicate errors must not consume automatic retry attempts.