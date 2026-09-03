import { runDuePdfJobs } from "../lib/pdf-job-runner"

const BATCH_SIZE = 5
const MAX_ROUNDS = 20

async function main() {
  let processed = 0
  let failed = 0
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const result = await runDuePdfJobs(BATCH_SIZE)
    processed += result.processed
    failed += result.failed
    if (result.processed + result.failed < BATCH_SIZE) break
  }
  console.log(JSON.stringify({ processed, failed }))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "PDF worker failed")
  process.exitCode = 1
})