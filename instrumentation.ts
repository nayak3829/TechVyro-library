let started = false

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || started) return
  started = true
  const { maybeRunPdfMaintenance } = await import("./lib/pdf-job-runner")
  void maybeRunPdfMaintenance()
  const timer = setInterval(() => { void maybeRunPdfMaintenance() }, 30_000)
  timer.unref()
}