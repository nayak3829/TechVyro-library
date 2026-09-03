---
name: Mixed CRUD save safety
description: Safety rule for UI saves that combine creates, updates, and destructive operations.
---

Never present a client-state rollback as if it undoes already completed server mutations. In mixed CRUD saves, validation-sensitive creates/updates must succeed before any delete is issued; after any partial failure, reload authoritative server state.

**Why:** Parallel mixed mutations can partially succeed even when the overall operation reports failure. Restoring only client state cannot reverse completed server writes and can hide data loss.

**How to apply:** Prefer one transactional server operation. Where that is unavailable, phase non-destructive writes before deletes, show the real server error, and reconcile from the server after failure.