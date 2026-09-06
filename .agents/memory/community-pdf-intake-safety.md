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

Public PDF analysis may prefill title, description, and hierarchy, but those values are assistive suggestions only. Never overwrite a contributor's manual edits when asynchronous analysis completes, and never weaken server-side metadata validation.

**Why:** Contributors expect document details to appear automatically after file selection, while extracted metadata can be incomplete or wrong and must remain reviewable.

**How to apply:** Provide an immediate filename-derived title, improve it from bounded local analysis when available, infer hierarchy only from confident signals, and keep submission APIs authoritative.

Submission finalization must be idempotent across an ambiguous commit/response-loss, and expired-object cleanup must claim the reservation under a database row lock before deleting storage.

**Why:** Retrying a successfully committed finalization can otherwise delete the object now referenced by the submission; cleanup can cause the same corruption if it races a finalization that started before expiry.

**How to apply:** Return the existing reservation-bound submission on a consumed retry. Give cleanup workers short-lived exact claim tokens acquired with row locking, make finalization reject active claims retryably, and mark cleanup complete only after storage deletion succeeds.

Signed-upload reservations must outlive every credential that can write their object, and a failed browser PUT must be treated as an ambiguous outcome rather than proof that no object exists.

**Why:** A signed URL that remains usable after cleanup can recreate an object that no worker will claim, while a committed upload whose response was lost makes a non-upsert retry conflict forever.

**How to apply:** Leave a safety margin between signed-URL expiry and reservation cleanup. After any PUT failure or conflict, attempt authoritative server finalization first; retry the upload only when the server confirms the reservation-bound object is absent.