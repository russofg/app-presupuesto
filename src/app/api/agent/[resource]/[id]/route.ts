/**
 * PUT / DELETE /api/agent/[resource]/[id]
 *
 * Per-document writes for the assistant. Like the collection route, every
 * operation is constrained to the owner: the target document is loaded and its
 * userId checked against OWNER_UID before anything is written, so the agent can
 * never edit or delete another user's document by guessing an id.
 *
 * Writable resources: `transactions`, `budgets`, `goals`. For goals, a PUT whose
 * body carries `contribute` (a number) moves the goal's saved amount instead of
 * editing its fields — that's the "sumar/retirar plata de la meta" path.
 */

import { NextResponse } from "next/server";
import { requireAgentAuth, AgentAuthError } from "@/lib/agent/auth";
import {
  updateTransactionForOwner,
  deleteTransactionForOwner,
  updateBudgetForOwner,
  deleteBudgetForOwner,
  updateGoalForOwner,
  contributeGoalForOwner,
  deleteGoalForOwner,
  updateCategoryForOwner,
  deleteCategoryForOwner,
  updateRecurringForOwner,
  deleteRecurringForOwner,
  AgentRequestError,
} from "@/lib/agent/writes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WRITABLE = new Set(["transactions", "budgets", "goals", "categories", "recurring"]);

/** Shared auth handling; returns the owner uid or a Response to return early. */
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const ownerUid = auth;

  const { resource, id } = await params;
  if (!WRITABLE.has(resource)) {
    return NextResponse.json({ error: `Edición no soportada para '${resource}' todavía` }, { status: 405 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  try {
    if (resource === "transactions") {
      return NextResponse.json({ ok: true, ...(await updateTransactionForOwner(ownerUid, id, body)) });
    }
    if (resource === "budgets") {
      return NextResponse.json({ ok: true, ...(await updateBudgetForOwner(ownerUid, id, body)) });
    }
    if (resource === "categories") {
      return NextResponse.json({ ok: true, ...(await updateCategoryForOwner(ownerUid, id, body)) });
    }
    if (resource === "recurring") {
      return NextResponse.json({ ok: true, ...(await updateRecurringForOwner(ownerUid, id, body)) });
    }
    // goals: a `contribute` number moves the saved amount; otherwise edit fields.
    if (body.contribute !== undefined) {
      return NextResponse.json({ ok: true, ...(await contributeGoalForOwner(ownerUid, id, body.contribute)) });
    }
    return NextResponse.json({ ok: true, ...(await updateGoalForOwner(ownerUid, id, body)) });
  } catch (err) {
    if (err instanceof AgentRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`[agent] update ${resource} error:`, err);
    return NextResponse.json({ error: `No se pudo editar en '${resource}'` }, { status: 502 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  const auth = authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const ownerUid = auth;

  const { resource, id } = await params;
  if (!WRITABLE.has(resource)) {
    return NextResponse.json({ error: `Borrado no soportado para '${resource}' todavía` }, { status: 405 });
  }

  try {
    if (resource === "transactions") {
      return NextResponse.json({ ok: true, ...(await deleteTransactionForOwner(ownerUid, id)) });
    }
    if (resource === "budgets") {
      return NextResponse.json({ ok: true, ...(await deleteBudgetForOwner(ownerUid, id)) });
    }
    if (resource === "categories") {
      return NextResponse.json({ ok: true, ...(await deleteCategoryForOwner(ownerUid, id)) });
    }
    if (resource === "recurring") {
      return NextResponse.json({ ok: true, ...(await deleteRecurringForOwner(ownerUid, id)) });
    }
    return NextResponse.json({ ok: true, ...(await deleteGoalForOwner(ownerUid, id)) });
  } catch (err) {
    if (err instanceof AgentRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`[agent] delete ${resource} error:`, err);
    return NextResponse.json({ error: `No se pudo borrar en '${resource}'` }, { status: 502 });
  }
}
