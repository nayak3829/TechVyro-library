---
name: Native packages in Next instrumentation
description: Why native Node dependencies must stay outside the Next instrumentation import graph.
---

Do not import job runners or analysis modules that transitively depend on native Node packages from Next instrumentation. Trigger them from Node request paths, post-response hooks, or dedicated worker commands.

**Why:** Next development instrumentation bundling attempted to resolve native package internals for a non-Node target, causing browser-visible build failures even though scripts, tests, and production builds could use the native dependency.

**How to apply:** Keep instrumentation dependency-free. Before adding an instrumentation import, inspect its complete import graph for native packages or Node built-ins.