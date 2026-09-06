---
name: Consolidated SQL parity
description: How to verify a one-file database setup really matches an ordered migration history.
---

Treat consolidated setup parity as final-state semantic equivalence, not object-name presence. Verify constraints, function security attributes and bodies, data backfills, policies, grants, default privileges, and safe second-run behavior.

**Why:** A consolidation can contain every expected object name while still omitting a security-definer attribute, a reconciliation backfill, or an integrity constraint. Later migrations can also intentionally replace earlier definitions.

**How to apply:** When mirroring migrations in one setup file, combine an object inventory with targeted assertions for high-risk semantics, account for later supersession, test rerun guards, and obtain an independent review before declaring parity.