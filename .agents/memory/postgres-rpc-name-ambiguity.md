---
name: Postgres RPC name ambiguity
description: PostgreSQL 17 behavior when PL/pgSQL parameters and table columns share names.
---

Keep existing Supabase RPC parameter names stable for API compatibility, but qualify parameter references with the function name when a table column has the same name. For partial unique indexes, use an unambiguous conflict action rather than repeating the shared name in a conflict target.

**Why:** PostgreSQL 17 can reject a conflict target as ambiguous when its column name is also a PL/pgSQL parameter, even though older code and the RPC call shape appear valid.

**How to apply:** When editing SQL RPCs, inspect insert expressions, conflict targets, and predicates for parameter/column name collisions; verify the function against the live database inside a rolled-back transaction.