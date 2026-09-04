---
name: Student engagement integrity
description: Security and delivery invariants for quiz progression, achievements, and content notifications.
---

Award quiz XP, streak progress, and achievements only from the first server-graded attempt for a user and quiz. Keep answer keys and explanations out of all pre-submission student payloads, use a per-attempt idempotency key for transport retries, and preserve full result history separately from reward eligibility.

**Why:** Client-computed result counts and pre-submission answer keys make progression forgeable, while result-key-only deduplication still allows repeated rewards for the same quiz.

**How to apply:** Any future quiz player or API change must preserve server-authoritative grading, hidden answers before submission, retry idempotency, and one progression award per quiz. Analytics may include every verified attempt.

Materialize notification preferences for every existing and newly created account, then publish only after an authoritative public-content transition. Await fan-out before the request ends, while keeping content publication successful if notification delivery fails.

**Why:** Lazy preference creation silently excludes users who have never opened settings, and detached server promises may not complete in serverless runtimes.

**How to apply:** New notification channels or event types must remain recipient-scoped, deduplicated, free of private content, and driven by real publish/update events.