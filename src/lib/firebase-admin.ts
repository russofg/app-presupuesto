import type { JWTVerifyGetKey } from "jose";

/**
 * Verificación de Firebase ID tokens SIN el Admin SDK.
 *
 * Para VERIFICAR un ID token solo hacen falta las claves PÚBLICAS de Google (no
 * la service account). Usamos `jose` con import dinámico para evitar el
 * ERR_REQUIRE_ESM que tira firebase-admin en el serverless de Netlify.
 *
 * Env:
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID: para validar issuer/audience del token.
 * - OWNER_UID (opcional): si está seteado, solo ese uid pasa.
 */

const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

let jwksCache: JWTVerifyGetKey | null = null;

async function getJwks(): Promise<JWTVerifyGetKey> {
  if (jwksCache) return jwksCache;
  const { createRemoteJWKSet } = await import("jose");
  jwksCache = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));
  return jwksCache;
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
 * Verifica el header `Authorization: Bearer <idToken>`.
 * - Falta/malformado → AuthError(401)
 * - Token inválido/expirado/firma mala → AuthError(401)
 * - OWNER_UID seteado y uid distinto → AuthError(403)
 * Config faltante (project id) → Error genérico (500).
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

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID no configurada");
  }

  const { jwtVerify } = await import("jose");
  const jwks = await getJwks();

  let uid: string | undefined;
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    uid = payload.sub;
  } catch {
    throw new AuthError("Token inválido", 401);
  }

  if (!uid) throw new AuthError("Token inválido", 401);

  const ownerUid = process.env.OWNER_UID;
  if (ownerUid && uid !== ownerUid) {
    throw new AuthError("Acceso denegado", 403);
  }

  return uid;
}
