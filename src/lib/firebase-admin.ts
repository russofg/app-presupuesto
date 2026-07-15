import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * Firebase Admin SDK — server-only.
 *
 * Required env vars:
 * - FIREBASE_SERVICE_ACCOUNT_KEY: the full service-account JSON credentials as a
 *   single JSON string. Used to verify Firebase ID tokens on protected API routes.
 * - OWNER_UID (optional): if set, only this uid is allowed through
 *   `verifyRequestAuth`; any other verified uid is rejected with 403.
 *
 * Initialization is LAZY: the Admin app is only created on the first call that
 * needs it. If FIREBASE_SERVICE_ACCOUNT_KEY is missing/invalid the app still
 * builds and unrelated pages keep working — only the protected routes fail.
 */

let adminApp: App | null = null;

function getAdminApp(): App {
  if (adminApp) return adminApp;

  const existing = getApps();
  if (existing.length > 0) {
    adminApp = existing[0];
    return adminApp;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY no configurada");
  }

  let serviceAccount: Record<string, unknown>;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY no es un JSON válido");
  }

  adminApp = initializeApp({
    credential: cert(serviceAccount as Parameters<typeof cert>[0]),
  });
  return adminApp;
}

export function adminAuth() {
  return getAuth(getAdminApp());
}

/**
 * Error tagged with an HTTP status so callers can map it to a response.
 */
export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/**
 * Verifies the `Authorization: Bearer <idToken>` header of a request.
 *
 * - Missing/malformed header → throws AuthError(401).
 * - Invalid token → throws AuthError(401).
 * - If OWNER_UID is set and the verified uid differs → throws AuthError(403).
 *
 * Returns the verified uid on success. Admin-init failures (e.g. missing
 * service account) propagate as a generic Error so routes can return 500.
 */
export async function verifyRequestAuth(request: Request): Promise<string> {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    throw new AuthError("Falta el token de autenticación", 401);
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    throw new AuthError("Falta el token de autenticación", 401);
  }

  let uid: string;
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    uid = decoded.uid;
  } catch (err) {
    if (err instanceof Error && err.message.includes("FIREBASE_SERVICE_ACCOUNT_KEY")) {
      // Admin not configured — let the route surface a 500 "Auth no configurada".
      throw err;
    }
    throw new AuthError("Token inválido", 401);
  }

  const ownerUid = process.env.OWNER_UID;
  if (ownerUid && uid !== ownerUid) {
    throw new AuthError("Acceso denegado", 403);
  }

  return uid;
}
