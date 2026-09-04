---
name: Community PDF intake safety
description: Security invariants for anonymous PDF staging, moderation, and publication.
---

Anonymous signed uploads must use a dedicated private bucket with the size and MIME limits enforced by storage itself. Persist the source bucket explicitly with an approved PDF; never infer it from the object path.

**Why:** Client-declared size and MIME values can be forged, and a shared larger bucket lets an attacker upload an oversized object before the application gets a chance to validate or download it.

**How to apply:** Keep staging paths reservation-bound, rate-limit reservations rather than trusting final submissions, validate the stored bytes server-side, and make every source reader, replacement, processor, and deletion path use a validated bucket/path pair.

Community PDFs may become public only when the exact immutable staged bytes have a clean server safety result. That invariant must be enforced by moderation, manual publishing, byte-serving routes, catalogue queries, aggregate SQL, and later background reprocessing.

**Why:** Guarding only the download route still advertises unsafe records, and a later manual publish can undo a worker's suspicious-file quarantine.

**How to apply:** Centralize the public-query predicate, reject unsafe approval/publish transitions, and atomically return a community PDF to private review if a later scan marks it suspicious.