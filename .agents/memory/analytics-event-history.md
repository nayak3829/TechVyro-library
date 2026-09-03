---
name: Analytics event history
description: Why analytics trends begin at event-tracking enablement instead of backfilling lifetime counters.
---

Daily analytics trends must use append-only view/download events and begin when event tracking is enabled. Do not distribute pre-existing lifetime counters into historical dates.

**Why:** Lifetime totals contain no timestamps, so any historical allocation would be fabricated and could mislead admins.

**How to apply:** Preserve lifetime counters for all-time totals, use real event timestamps for range charts, and clearly allow earlier buckets to remain zero.