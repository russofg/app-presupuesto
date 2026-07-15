import { readFileSync } from "fs";

/**
 * Firebase Admin SDK — server-only.
 *
 * Required env vars:
 * - FIREBASE_SERVICE_ACCOUNT_KEY: las credenciales de la service account, como
 *   JSON crudo, ruta a un archivo .json (dev local) o JSON en base64 (prod).
 * - OWNER_UID (opcional): si está seteado, solo ese uid pasa `verifyRequestAuth`.
 *
 * `firebase-admin` se importa DINÁMICAMENTE dentro de la función (no en el scope
 * del módulo) para que la carga del módulo nunca crashee en entornos serverless
 * como Netlify. Si el import o la credencial fallan, el error se propaga y el
 * handler responde con JSON, no con un 500 de texto plano.
 */

function parseServiceAccount(raw: string): Record<string, unknown> | null {
  const tryJson = (s: string): Record<string, unknown> | null => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };
  const tryFile = (p: string): Record<string, unknown> | null => {
    try {
      return tryJson(readFileSync(p.trim(), "utf8"));
    } catch {
      return null;
    }
  };
  return (
    tryJson(raw) ??
    (raw.trim().endsWith(".json") ? tryFile(raw) : null) ??
    tryJson(Buffer.from(raw, "base64").toString("utf8"))
  );
}

async function getAdminAuth() {
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");

  const existing = getApps();
  if (existing.length > 0) return getAuth(existing[0]);

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY no configurada");

  const serviceAccount = parseServiceAccount(raw);
  if (!serviceAccount) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY no es JSON, ruta .json ni base64 válido");
  }

  const app = initializeApp({
    credential: cert(serviceAccount as Parameters<typeof cert>[0]),
  });
  return getAuth(app);
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
 * Verifica el header `Authorization: Bearer <idToken>` de la request.
 * - Falta/malformado → AuthError(401)
 * - Token inválido → AuthError(401)
 * - OWNER_UID seteado y uid distinto → AuthError(403)
 * Fallas de config (service account) se propagan como Error genérico (500).
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

  // Cargar/inicializar el Admin SDK: si falla (import o credencial), propagamos
  // el Error genérico para que la ruta responda 500 con JSON diagnosticable.
  const auth = await getAdminAuth();

  // Verificar el token: acá sí, un fallo es token inválido → 401.
  let uid: string;
  try {
    const decoded = await auth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    throw new AuthError("Token inválido", 401);
  }

  const ownerUid = process.env.OWNER_UID;
  if (ownerUid && uid !== ownerUid) {
    throw new AuthError("Acceso denegado", 403);
  }

  return uid;
}
