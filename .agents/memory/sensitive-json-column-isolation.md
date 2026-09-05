---
name: Sensitive JSON column isolation
description: Why row-level security cannot safely expose rows whose JSON fields mix public content with secrets.
---

Do not expose a table directly to browser roles when one readable JSON column contains both public quiz content and answer keys. Keep the table server-only or split public questions and sensitive grading data into separately protected storage.

**Why:** Row-level security controls rows, not individual keys inside a JSON value. A policy that permits a quiz row also permits clients to request the entire answer-bearing JSON column.

**How to apply:** Whenever structured content mixes display data with answers, explanations, moderation notes, or other secrets, use server projections or physically separate protected columns/tables before granting browser access.