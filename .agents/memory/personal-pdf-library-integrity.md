---
name: Personal PDF library integrity
description: Trust boundaries for saved PDFs, recent reading, and per-user download history.
---

My Library data must derive user ownership from authenticated server context, and every returned document must pass the same public-visibility policy as public PDF routes. Record a download only after access checks and successful file generation.

**Why:** Client-supplied user IDs can cross account boundaries, aggregate counters cannot reconstruct personal history, and recording before file generation creates false downloads. Hidden, unpublished, or quarantined PDFs must never leak through historical activity.

**How to apply:** Use a consolidated per-user activity record for view/download timestamps and counts. Keep guest browser history as a fallback, call activity writes through trusted server code, and filter saved/activity joins through the canonical public PDF visibility helper.