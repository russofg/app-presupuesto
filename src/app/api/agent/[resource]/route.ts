/**
 * GET /api/agent/[resource]
 *
 * Generic read access for the assistant over the owner's data. `resource` is one
 * of the keys in READ_RESOURCES (transactions, categories, budgets, goals,
 * recurring). Every query is forced to `userId == OWNER_UID`, so the agent can
 * only ever see the owner's own documents.
 *
 * Query params (where the resource supports them):
 * - transactions: month, year (Argentina month range), type (income|expense)
 * - budgets: month, year (matched as stored fields)
 */

import { NextResponse } from "next/server";
import { requireAgentAuth, AgentAuthError } from "@/lib/agent/auth";
import { listCollection, type QueryFilter } from "@/lib/agent/firestore-rest";
import { getResource } from "@/lib/agent/resources";
import { monthRange, resolveMonthYear } from "@/lib/agent/time";
import {
  createTransactionForOwner,
  createBudgetForOwner,
  createGoalForOwner,
  createCategoryForOwner,
  createRecurringForOwner,
  AgentRequestError,
} from "@/lib/agent/writes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Shared auth handling for the agent routes; returns the owner uid or a Response to return early. */
function authenticate(request: Request): string | NextResponse {
  try {
    return requireAgentAuth(request);
  } catch (err) {
    if (err instanceof AgentAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[agent] auth/config error:", err);
    return NextResponse.json({ error: "Configuración de agente incompleta" }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ resource: string }> }
) {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const ownerUid = auth;

  const { resource } = await params;
  const config = getResource(resource);
  if (!config) {
    return NextResponse.json({ error: `Recurso desconocido: ${resource}` }, { status: 404 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters: QueryFilter[] = [{ field: "userId", op: "EQUAL", value: ownerUid }];

    // Transactions: optional type + Argentina month range (mirrors the app's own query).
    if (config.supportsType) {
      const type = searchParams.get("type");
      if (type === "income" || type === "expense") {
        filters.push({ field: "type", op: "EQUAL", value: type });
      }
    }
    if (config.supportsMonthRange && (searchParams.get("month") || searchParams.get("year"))) {
      const { month, year } = resolveMonthYear(searchParams);
      const { start, end } = monthRange(year, month);
      filters.push({ field: "date", op: "GREATER_THAN_OR_EQUAL", value: start });
      filters.push({ field: "date", op: "LESS_THAN", value: end });
    }
    // Budgets store month/year as plain integer fields.
    if (config.supportsMonthYearFields && (searchParams.get("month") || searchParams.get("year"))) {
      const { month, year } = resolveMonthYear(searchParams);
      filters.push({ field: "month", op: "EQUAL", value: month });
      filters.push({ field: "year", op: "EQUAL", value: year });
    }

    // Cap only the fully-unbounded transactions history, like the client does.
    const isBoundedTx =
      config.supportsMonthRange && (searchParams.get("month") || searchParams.get("year"));
    const limit = config.supportsMonthRange && !isBoundedTx ? 300 : undefined;

    const data = await listCollection(config.collection, {
      filters,
      orderBy: config.orderBy,
      limit,
    });

    return NextResponse.json({ resource, count: data.length, data });
  } catch (err) {
    console.error(`[agent] read ${resource} error:`, err);
    return NextResponse.json({ error: "No se pudo leer el recurso" }, { status: 502 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ resource: string }> }
) {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const ownerUid = auth;

  const { resource } = await params;
  const CREATABLE = ["transactions", "budgets", "goals", "categories", "recurring"];
  if (!CREATABLE.includes(resource)) {
    return NextResponse.json(
      { error: `Creación no soportada para '${resource}' todavía` },
      { status: 405 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  try {
    if (resource === "transactions") {
      const transaction = await createTransactionForOwner(ownerUid, body);
      return NextResponse.json({ ok: true, transaction }, { status: 201 });
    }
    if (resource === "budgets") {
      const budget = await createBudgetForOwner(ownerUid, body);
      return NextResponse.json({ ok: true, budget }, { status: 201 });
    }
    if (resource === "goals") {
      const goal = await createGoalForOwner(ownerUid, body);
      return NextResponse.json({ ok: true, goal }, { status: 201 });
    }
    if (resource === "categories") {
      const category = await createCategoryForOwner(ownerUid, body);
      return NextResponse.json({ ok: true, category }, { status: 201 });
    }
    const recurring = await createRecurringForOwner(ownerUid, body);
    return NextResponse.json({ ok: true, recurring }, { status: 201 });
  } catch (err) {
    if (err instanceof AgentRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`[agent] create ${resource} error:`, err);
    return NextResponse.json({ error: `No se pudo crear en '${resource}'` }, { status: 502 });
  }
}
