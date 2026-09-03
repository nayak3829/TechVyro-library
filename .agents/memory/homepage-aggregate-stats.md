---
name: Homepage aggregate stats
description: How to keep public homepage totals accurate without loading the full PDF catalogue.
---

Compute site-wide public PDF totals in a narrow SQL RPC, while fetching only a bounded set of rows for homepage cards. Do not sum or average the bounded card response.

**Why:** This project's PostgREST configuration rejects aggregate expressions with `PGRST123`, and loading every public PDF into JavaScript makes homepage cost grow with the catalogue.

**How to apply:** When adding a new catalogue-wide homepage metric, extend the read-only aggregate function and its typed mapper. Keep card queries independently bounded and preserve the same visibility, publication, and scheduling rules in both paths.