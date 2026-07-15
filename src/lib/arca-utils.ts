import { createPrivateKey } from "crypto";

/**
 * Parses a cert/key env var, handling escaped newlines from some env providers.
 */
export function parsePem(env: string | undefined): string {
  if (!env) return "";
  return env.replace(/\\n/g, "\n");
}

/**
 * Converts PKCS#8 private key (-----BEGIN PRIVATE KEY-----) to
 * RSA PKCS#1 format (-----BEGIN RSA PRIVATE KEY-----).
 * node-forge requires PKCS#1 RSA format.
 */
export function ensureRsaKey(keyPem: string): string {
  if (keyPem.includes("BEGIN RSA PRIVATE KEY")) return keyPem;
  try {
    const privateKey = createPrivateKey({ key: keyPem, format: "pem" });
    return privateKey.export({ type: "pkcs1", format: "pem" }) as string;
  } catch (e) {
    console.error("[ARCA] Cannot convert key format:", e);
    return keyPem;
  }
}

/** Returns cert PEM and RSA key PEM from env vars */
export function getArcaCredentials(): {
  cert: string;
  key: string;
  cuit: number;
  production: boolean;
  ptoVenta: number;
  nombre: string;
} {
  const cert = parsePem(process.env.ARCA_CERT);
  const rawKey = parsePem(process.env.ARCA_KEY);
  const key = ensureRsaKey(rawKey);
  const cuit = parseInt(process.env.ARCA_CUIT!);
  const production = process.env.ARCA_PRODUCTION === "true";
  const ptoVenta = parseInt(process.env.ARCA_PTO_VENTA ?? "4");
  const nombre = process.env.ARCA_NOMBRE ?? "Emisor";

  console.log(
    "[ARCA] CUIT:", cuit,
    "| production:", production,
    "| ptoVenta:", ptoVenta,
    "| cert ok:", cert.includes("BEGIN CERTIFICATE"),
    "| key format:", key.includes("BEGIN RSA PRIVATE KEY") ? "RSA PKCS#1 ✓" : "PKCS#8 (⚠)"
  );

  return { cert, key, cuit, production, ptoVenta, nombre };
}
