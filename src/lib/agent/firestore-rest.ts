/**
 * Server-only Firestore admin access over the REST API.
 *
 * This is the "as the owner" backend used by the /api/agent/* routes so the
 * assistant (Maria) can read and write the user's data. It authenticates with a
 * Google service account using Node's builtin `crypto` to mint an OAuth token —
 * NO firebase-admin, so the ERR_REQUIRE_ESM that the Admin SDK triggers on the
 * Netlify serverless runtime never arises, and NO extra dependency is added.
 *
 * Only READ helpers are exported for now (getDocument, listCollection). Write
 * helpers will be added in a later step, on top of the same token flow.
 *
 * Env:
 * - FIREBASE_SERVICE_ACCOUNT_KEY: the service account JSON. In Netlify it is
 *   stored wrapped in surrounding quotes, so we strip them before parsing.
 */

import crypto from "node:crypto";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const DATASTORE_SCOPE = "https://www.googleapis.com/auth/datastore";

interface ServiceAccount {
  clientEmail: string;
  privateKey: string;
  projectId: string;
}

let serviceAccountCache: ServiceAccount | null = null;
let tokenCache: { token: string; expiresAt: number } | null = null;

function loadServiceAccount(): ServiceAccount {
  if (serviceAccountCache) return serviceAccountCache;

  let raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY no está configurada");

  // Netlify stores the JSON wrapped in surrounding quotes ('{...}'); strip them.
  raw = raw.trim().replace(/^['"]|['"]$/g, "");

  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Some setups store the JSON base64-encoded.
    parsed = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  }

  let privateKey = parsed.private_key;
  if (privateKey && privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  if (!parsed.client_email || !privateKey || !parsed.project_id) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY incompleta (falta client_email/private_key/project_id)");
  }

  serviceAccountCache = {
    clientEmail: parsed.client_email,
    privateKey,
    projectId: parsed.project_id,
  };
  return serviceAccountCache;
}

export function getProjectId(): string {
  return loadServiceAccount().projectId;
}

const b64url = (input: string) => Buffer.from(input).toString("base64url");

/**
 * Returns a cached (or freshly minted) OAuth access token scoped to Firestore.
 * The JWT is signed RS256 with the service account private key.
 */
async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.expiresAt - 60 > now) {
    return tokenCache.token;
  }

  const sa = loadServiceAccount();
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.clientEmail,
    scope: DATASTORE_SCOPE,
    aud: TOKEN_ENDPOINT,
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  const signature = signer.sign(sa.privateKey).toString("base64url");
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!res.ok || !json.access_token) {
    throw new Error(`No se pudo obtener el token de service account (${res.status})`);
  }

  tokenCache = {
    token: json.access_token,
    expiresAt: now + (json.expires_in ?? 3600),
  };
  return tokenCache.token;
}

// ─── Firestore REST value <-> JS conversion ──────────────────────────────────

type FirestoreValue = Record<string, unknown>;

/** Decodes a Firestore REST `Value` into a plain JS value. Timestamps stay as ISO strings (JSON-friendly). */
export function decodeValue(v: FirestoreValue | undefined | null): unknown {
  if (v == null) return null;
  if ("nullValue" in v) return null;
  if ("stringValue" in v) return v.stringValue as string;
  if ("booleanValue" in v) return v.booleanValue as boolean;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue as number;
  if ("timestampValue" in v) return v.timestampValue as string;
  if ("mapValue" in v) return decodeFields((v.mapValue as { fields?: Record<string, FirestoreValue> })?.fields ?? {});
  if ("arrayValue" in v) {
    const values = (v.arrayValue as { values?: FirestoreValue[] })?.values ?? [];
    return values.map(decodeValue);
  }
  if ("referenceValue" in v) return v.referenceValue as string;
  return null;
}

export function decodeFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = decodeValue(value);
  }
  return out;
}

/** Builds a Firestore REST `fields` map from a plain object, dropping undefined/NaN (like the app's cleanData). */
export function encodeFields(obj: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (typeof value === "number" && Number.isNaN(value)) continue;
    fields[key] = encodeValue(value);
  }
  return fields;
}

/** Encodes a plain JS value into a Firestore REST `Value`. Used by filters (and, later, writes). */
export function encodeValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeValue) } };
  }
  if (typeof value === "object") {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      fields[k] = encodeValue(v);
    }
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

export interface DocRecord {
  id: string;
  [key: string]: unknown;
}

function idFromName(name: string): string {
  return name.split("/").pop() ?? name;
}

/** Reads a single document at `<collection>/<docId>`. Returns null on 404. */
export async function getDocument(collection: string, docId: string): Promise<DocRecord | null> {
  const token = await getAccessToken();
  const projectId = getProjectId();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${encodeURIComponent(docId)}`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Firestore getDocument ${collection}/${docId} → ${res.status}: ${JSON.stringify(json)}`);
  }
  return { id: docId, ...decodeFields(json.fields ?? {}) };
}

export type FilterOp =
  | "EQUAL"
  | "GREATER_THAN"
  | "GREATER_THAN_OR_EQUAL"
  | "LESS_THAN"
  | "LESS_THAN_OR_EQUAL";

export interface QueryFilter {
  field: string;
  op: FilterOp;
  value: unknown;
}

export interface QueryOptions {
  filters: QueryFilter[];
  orderBy?: { field: string; direction: "ASCENDING" | "DESCENDING" } | null;
  limit?: number;
}

/**
 * Runs a structured query over a collection and returns decoded documents.
 * Mirrors the app's own client-side queries (same filters/order) so results and
 * the composite indexes already defined in firestore.indexes.json line up.
 */
export async function listCollection(collection: string, options: QueryOptions): Promise<DocRecord[]> {
  const token = await getAccessToken();
  const projectId = getProjectId();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

  const fieldFilters = options.filters.map((f) => ({
    fieldFilter: {
      field: { fieldPath: f.field },
      op: f.op,
      value: encodeValue(f.value),
    },
  }));

  const structuredQuery: Record<string, unknown> = {
    from: [{ collectionId: collection }],
  };
  if (fieldFilters.length === 1) {
    structuredQuery.where = fieldFilters[0];
  } else if (fieldFilters.length > 1) {
    structuredQuery.where = { compositeFilter: { op: "AND", filters: fieldFilters } };
  }
  if (options.orderBy) {
    structuredQuery.orderBy = [
      { field: { fieldPath: options.orderBy.field }, direction: options.orderBy.direction },
    ];
  }
  if (options.limit) {
    structuredQuery.limit = options.limit;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Firestore runQuery ${collection} → ${res.status}: ${JSON.stringify(json)}`);
  }

  const rows = (json as Array<{ document?: { name: string; fields?: Record<string, FirestoreValue> } }>) ?? [];
  return rows
    .filter((row) => row.document)
    .map((row) => ({
      id: idFromName(row.document!.name),
      ...decodeFields(row.document!.fields ?? {}),
    }));
}

// ─── Write helpers ────────────────────────────────────────────────────────────

const ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** Generates a 20-char document id from the Firestore auto-id alphabet. */
export function newDocId(): string {
  const bytes = crypto.randomBytes(20);
  let id = "";
  for (let i = 0; i < 20; i++) id += ID_ALPHABET[bytes[i] % ID_ALPHABET.length];
  return id;
}

export type CommitOp =
  | { kind: "set"; path: string; data: Record<string, unknown> }
  | { kind: "update"; path: string; data: Record<string, unknown> }
  | { kind: "delete"; path: string }
  | { kind: "increment"; path: string; field: string; by: number };

/**
 * Commits a set of writes atomically (mirrors the app's writeBatch). `path` is a
 * document path like "transactions/<id>". Used to keep a document write and its
 * settings.totalXP increment in a single all-or-nothing operation.
 */
export async function commitBatch(ops: CommitOp[]): Promise<void> {
  const token = await getAccessToken();
  const projectId = getProjectId();
  const prefix = `projects/${projectId}/databases/(default)/documents`;

  const writes = ops.map((op) => {
    const name = `${prefix}/${op.path}`;
    if (op.kind === "set") {
      return { update: { name, fields: encodeFields(op.data) } };
    }
    if (op.kind === "update") {
      // Partial update: an updateMask makes Firestore touch ONLY these fields
      // (mirrors the app's updateDoc), instead of replacing the whole document.
      const fields = encodeFields(op.data);
      return { update: { name, fields }, updateMask: { fieldPaths: Object.keys(fields) } };
    }
    if (op.kind === "delete") {
      return { delete: name };
    }
    return {
      transform: {
        document: name,
        fieldTransforms: [{ fieldPath: op.field, increment: { integerValue: String(op.by) } }],
      },
    };
  });

  const res = await fetch(`https://firestore.googleapis.com/v1/${prefix}:commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ writes }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Firestore commit → ${res.status}: ${JSON.stringify(json)}`);
  }
}
