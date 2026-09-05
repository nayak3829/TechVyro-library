---
name: Cookie capability origin checks
description: Origin-enforcement rule for privileged and participant-bound HttpOnly cookie endpoints.
---

Treat privileged session cookies and signed participant cookies as capabilities that require explicit same-origin or Fetch Metadata validation on state changes and sensitive polling.

**Why:** HttpOnly and SameSite reduce credential theft and common CSRF paths, but they do not prove the request came from the intended application origin in every proxy, browser, or navigation case.

**How to apply:** Validate canonical origin/proxy authority before cookie-authorized mutations, reject proven cross-site requests, and define deliberate behavior for originless non-browser calls and logout cleanup.