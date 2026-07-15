/**
 * Direct ARCA WSAA authentication module.
 * Generates a PKCS#7 signed CMS from the LoginTicketRequest XML
 * and sends it directly to ARCA's WSAA SOAP endpoint.
 * No third-party services involved.
 * 
 * Token is persisted to disk (/tmp/arca-wsaa-token-{key}.json)
 * so it survives hot-reloads and server restarts.
 */

import axios from "axios";
import fs from "fs";
import path from "path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const forge = require("node-forge");

const WSAA_HOMO = "https://wsaahomo.afip.gov.ar/ws/services/LoginCms";
const WSAA_PROD = "https://wsaa.afip.gov.ar/ws/services/LoginCms";

// ── Disk-based token cache ──────────────────────────────────────────────────
// Persists to /tmp so it survives Next.js hot-reloads and server restarts.

interface TokenCache {
  token: string;
  sign: string;
  expiry: number; // Unix ms
}

function cacheFilePath(cuit: number, service: string, production: boolean): string {
  const env = production ? "prod" : "homo";
  return path.join("/tmp", `arca-wsaa-${cuit}-${service}-${env}.json`);
}

function readCachedToken(cuit: number, service: string, production: boolean): { token: string; sign: string } | null {
  const filePath = cacheFilePath(cuit, service, production);
  try {
    if (!fs.existsSync(filePath)) return null;
    const data: TokenCache = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    // 5 min safety margin
    if (Date.now() < data.expiry - 5 * 60_000) {
      const minsLeft = Math.round((data.expiry - Date.now()) / 60_000);
      console.log(`[WSAA] Using cached token from disk (${filePath}), expires in ${minsLeft} min`);
      return { token: data.token, sign: data.sign };
    }
    // Expired — delete file
    fs.unlinkSync(filePath);
    console.log("[WSAA] Cached token expired, deleted", filePath);
    return null;
  } catch {
    return null;
  }
}

function writeCachedToken(cuit: number, service: string, production: boolean, token: string, sign: string) {
  const filePath = cacheFilePath(cuit, service, production);
  const data: TokenCache = {
    token,
    sign,
    expiry: Date.now() + 11 * 60 * 60_000 + 50 * 60_000, // 11h50m
  };
  try {
    fs.writeFileSync(filePath, JSON.stringify(data), "utf-8");
    console.log(`[WSAA] Token saved to disk: ${filePath} (valid ~11h50m)`);
  } catch (e) {
    console.warn("[WSAA] Could not write token cache:", e);
  }
}

// ── TRA + CMS ────────────────────────────────────────────────────────────────

function createTRA(service: string): string {
  const now = new Date();
  const toArgTime = (d: Date) => {
    const off = -3 * 60;
    const local = new Date(d.getTime() + off * 60_000);
    return local.toISOString().slice(0, 19) + "-03:00";
  };
  const genTime = new Date(now.getTime() - 60_000);
  const expTime = new Date(now.getTime() + 12 * 60 * 60_000);
  const uniqueId = Math.floor(Math.random() * 2_147_483_647);

  return `<?xml version="1.0" encoding="UTF-8"?><loginTicketRequest version="1.0"><header><uniqueId>${uniqueId}</uniqueId><generationTime>${toArgTime(genTime)}</generationTime><expirationTime>${toArgTime(expTime)}</expirationTime></header><service>${service}</service></loginTicketRequest>`;
}

function signTRA(tra: string, certPem: string, keyPem: string): string {
  const cert = forge.pki.certificateFromPem(certPem);
  const privKey = forge.pki.privateKeyFromPem(keyPem);

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(tra, "utf8");
  p7.addCertificate(cert);
  p7.addSigner({
    key: privKey,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  });
  p7.sign({ detached: false });

  const der: string = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return Buffer.from(der, "binary").toString("base64");
}

// ── WSAA SOAP call ──────────────────────────────────────────────────────────

async function callWSAA(cms: string, production: boolean): Promise<{ token: string; sign: string }> {
  const url = production ? WSAA_PROD : WSAA_HOMO;

  const soapBody = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov"><soapenv:Body><wsaa:loginCms><wsaa:in0>${cms}</wsaa:in0></wsaa:loginCms></soapenv:Body></soapenv:Envelope>`;

  let xmlResponse = "";
  try {
    const response = await axios.post(url, soapBody, {
      headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: "" },
      timeout: 30_000,
    });
    xmlResponse = response.data;
  } catch (axiosErr: any) {
    if (axiosErr.response?.data) {
      xmlResponse = axiosErr.response.data as string;
    } else {
      throw axiosErr;
    }
  }

  // Check for alreadyAuthenticated
  if (xmlResponse.includes("alreadyAuthenticated")) {
    throw new Error("ARCA_ALREADY_AUTHENTICATED");
  }

  // Check for other SOAP faults
  if (xmlResponse.includes("faultstring")) {
    const fault = xmlResponse.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] ?? "SOAP Fault";
    throw new Error(`WSAA SOAP fault: ${fault}`);
  }

  // Decode HTML entities (ARCA wraps response in loginCmsReturn with &lt; &gt; etc.)
  const decoded = xmlResponse
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&apos;/g, "'");

  const token = decoded.match(/<token>([\s\S]*?)<\/token>/)?.[1]?.trim() ?? "";
  const sign = decoded.match(/<sign>([\s\S]*?)<\/sign>/)?.[1]?.trim() ?? "";

  if (!token || !sign) {
    throw new Error(`WSAA response incomplete. Response: ${decoded.slice(0, 500)}`);
  }

  return { token, sign };
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function getWSAAToken(
  service: string,
  certPem: string,
  keyPem: string,
  production: boolean,
  cuit: number
): Promise<{ token: string; sign: string }> {
  // 1. Check disk cache first (survives hot-reloads!)
  const cached = readCachedToken(cuit, service, production);
  if (cached) return cached;

  // 2. No cached token — request a new one
  const tra = createTRA(service);
  console.log("[WSAA] Requesting new token for service:", service, "| CUIT:", cuit);

  const cms = signTRA(tra, certPem, keyPem);
  console.log("[WSAA] CMS signed, length:", cms.length);

  try {
    const result = await callWSAA(cms, production);
    console.log("[WSAA] ✅ Token obtained successfully");

    // Save to disk so it persists
    writeCachedToken(cuit, service, production, result.token, result.sign);
    return result;
  } catch (err: any) {
    if (err.message === "ARCA_ALREADY_AUTHENTICATED") {
      console.error("[WSAA] ❌ alreadyAuthenticated — ARCA has a token we don't have cached.");
      console.error("[WSAA] This means a previous session created a token that's still valid.");
      console.error("[WSAA] Tokens expire after 12h. Delete /tmp/arca-wsaa-*.json if stale.");
      throw new Error(
        "El certificado ya tiene un token activo en ARCA (válido por 12hs). " +
        "Esperá unos minutos y volvé a intentar. Si sigue fallando, esperá hasta que expire el token anterior."
      );
    }
    throw err;
  }
}
