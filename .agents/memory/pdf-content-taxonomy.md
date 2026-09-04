---
name: PDF content taxonomy
description: Compatibility rules for the generic PDF study hierarchy alongside older category and folder systems.
---

Treat PDF content type, content category, content subcategory, and subject as an additional study taxonomy. Do not repurpose or replace the relational category or folder structure; those remain independent compatibility and navigation systems.

**Why:** The project already used both a category foreign key and a folder/category/section location before the flexible content hierarchy was introduced. Conflating them would break older filters, admin tools, and saved content.

**How to apply:** New PDF create flows require a complete generic hierarchy. Existing incomplete records remain readable and editable without erasing their metadata. Only write hierarchy fields during replacement or editing when a complete hierarchy was intentionally supplied.

Store college branch and semester reversibly inside the bounded content-subcategory value while presenting them as separate dependent controls.

**Why:** College needs one more logical level than the four generic database fields provide.

**How to apply:** Use the shared join/split helpers everywhere; never parse or compose the combined college value ad hoc.