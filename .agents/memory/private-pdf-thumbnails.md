---
name: Private PDF thumbnails
description: Security and rendering rules for thumbnails stored with private PDFs.
---

Keep the PDF storage bucket private. Public clients should receive only an application thumbnail URL; the application route must apply the same visibility, publish-status, and scheduling rules as PDF viewing before streaming the image.

**Why:** Raw private storage paths are not usable as browser image URLs and exposing or signing them in catalogue payloads weakens the access boundary. Document previews also need a graceful icon fallback when older records have no thumbnail.

**How to apply:** Any new PDF listing or card should consume the policy-aware thumbnail URL rather than a storage path. Render portrait document pages with a contained fit so the preview is recognizable instead of cropping to a blank page margin.