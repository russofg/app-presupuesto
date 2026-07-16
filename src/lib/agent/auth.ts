/**
 * Auth for the /api/agent/* routes (Maria, the assistant, acting as the owner).
 *
 * Unlike the app's user-facing routes — which verify a Firebase ID token — the
 * agent runs headless on the VPS with no login session and no expiring token.
 * So it authenticates with a long-lived shared secret sent as `X-API-Key`,
 * checked in constant time against MARIA_API_KEY. A valid key maps to the single
 * owner identity (OWNER_UID); there is no multi-user surface here on purpose.
 *
 * Env:
 * - MARIA_API_KEY: the shared secret Maria sends. Use a long random value.
 * - OWNER_UID: the Firebase uid every agent action is scoped to.
 */

import crypto from "node:crypto";

export class AgentAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AgentAuthError";
    this.status = status;
  }
}

function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws on length mismatch, so guard length first (a length
  // difference is not secret) and only then compare in constant time.
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies the `X-API-Key` header and returns the owner uid to act as.
 * - Missing MARIA_API_KEY / OWNER_UID config → Error (500).
 * - Missing or wrong key → AgentAuthError(401).
 */
export function requireAgentAuth(request: Request): string {
  const expectedKey = process.env.MARIA_API_KEY;
  const ownerUid = process.env.OWNER_UID;

  if (!expectedKey) throw new Error("MARIA_API_KEY no está configurada");
  if (!ownerUid) throw new Error("OWNER_UID no está configurada");

  const provided = request.headers.get("x-api-key") ?? "";
  if (!provided || !safeEquals(provided, expectedKey)) {
    throw new AgentAuthError("Clave de acceso inválida", 401);
  }

  return ownerUid;
}
