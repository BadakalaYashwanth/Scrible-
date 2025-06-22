/**
 * Tiny, Edge-compatible token helpers – DEMO ONLY!
 * -----------------------------------------------------------------
 * generateToken  → "userId.timestamp.random"
 * parseUserId    → returns userId or null
 *
 * ❗ Replace with a real JWT solution (e.g. Auth.js, Supabase, Clerk)
 *    when you move to a proper server runtime.
 */
export function generateToken(userId: string): string {
  const ts = Date.now()
  const rnd =
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  return [userId, ts, rnd].join(".")
}

export function parseUserId(token: string | undefined | null): string | null {
  if (!token) return null
  const parts = token.split(".")
  return parts.length ? parts[0] : null
}
