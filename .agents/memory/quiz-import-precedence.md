---
name: Quiz import precedence
description: Durable rules for automatic JSON and HTML quiz import behavior.
---

For quiz imports, use embedded metadata first, then inferred metadata, and apply admin-selected settings only as explicit overrides. Preflight the final canonical quiz before any write.

**Why:** Applying default form values during parsing silently reclassified imported quizzes, while late server-only validation made batch failures harder to understand and retry.

**How to apply:** Keep JSON, HTML, pasted, and future AI import paths consistent. Detect same-batch duplicates before selection, auto-resolve content structure from the final category, and never let bulk selection re-enable invalid items.