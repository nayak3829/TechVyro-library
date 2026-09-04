export function becamePublicQuiz(
  previous: { enabled: unknown, visibility: unknown },
  next: { enabled: unknown, visibility: unknown },
) {
  return next.enabled === true && next.visibility === "public"
    && (previous.enabled !== true || previous.visibility !== "public")
}