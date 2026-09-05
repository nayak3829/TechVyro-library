---
name: Homepage payload budget
description: Keep homepage transfer and hydration costs bounded as the catalogue grows.
---

Homepage server payloads must contain only the bounded records and metadata visible in homepage cards. Preserve real aggregate totals separately, and defer below-fold data fetches until their section approaches the viewport.

**Why:** Serializing every quiz and thousands of question IDs made initial HTML/RSC payload size scale with the entire catalogue. Below-fold fetches and eager thumbnails then competed with opening interactions, making the site feel slow even when the first server response was healthy.

**How to apply:** Project full datasets into count fields plus a small deduplicated candidate set before passing data to client components. Share identical client requests, avoid immediate background revalidation after a fresh server render, lazy-load card media, and gate expensive lower sections with viewport proximity.