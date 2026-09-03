export async function register() {
  // PDF work is triggered after successful uploads and opportunistically by
  // the homepage API. Keep instrumentation dependency-free so native server
  // packages are never bundled into the instrumentation runtime.
}