/**
 * PUT / DELETE /api/agent/[resource]/[id]
 *
 * Per-document writes for the assistant. Like the collection route, every
 * operation is constrained to the owner: the target document is loaded and its
 * userId checked against OWNER_UID before anything is written, so the agent can
 * never edit or delete another user's document by guessing an id.
 *
 * Currently only `transactions` is writable here; budgets and goals return 405
 * until their write paths land.
 */

import { NextResponse } from "next/server";
import { requireAgentAuth, AgentAuthError } from "@/lib/agent/auth";
import {
  updateTransactionForOwner,
  deleteTransactionForOwner,
  AgentRequestError,
} from "@/lib/agent/writes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  if (resource !== "transactions") {
    return NextResponse.json(
      { error: `Edición no soportada para '${resource}' todavía` },
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
    const result = await updateTransactionForOwner(ownerUid, id, body);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof AgentRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[agent] update transaction error:", err);
    return NextResponse.json({ error: "No se pudo editar la transacción" }, { status: 502 });
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
  if (resource !== "transactions") {
    return NextResponse.json(
      { error: `Borrado no soportado para '${resource}' todavía` },
      { status: 405 }
    );
  }

  try {
    const result = await deleteTransactionForOwner(ownerUid, id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof AgentRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[agent] delete transaction error:", err);
    return NextResponse.json({ error: "No se pudo borrar la transacción" }, { status: 502 });
  }
}
