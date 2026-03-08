"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  CreditCard, ArrowDownLeft, ArrowUpRight, RefreshCw, 
  Plus, ChevronDown, ChevronUp, Loader2, AlertCircle, Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MpMovement {
  id: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  type: "income" | "expense";
  category: string;
  payerName: string;
  operationType: string;
}

interface MercadoPagoWidgetProps {
  onImport?: (movement: MpMovement) => Promise<void>;
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency === "ARS" ? "ARS" : "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

export function MercadoPagoWidget({ onImport }: MercadoPagoWidgetProps) {
  const [movements, setMovements] = useState<MpMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [imported, setImported] = useState<Set<string>>(new Set());

  const fetchMovements = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mercadopago/movements?limit=20");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al obtener movimientos");
      setMovements(data.movements ?? []);
      setExpanded(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (movement: MpMovement) => {
    if (!onImport || importing) return;
    setImporting(movement.id);
    try {
      await onImport(movement);
      setImported(prev => new Set([...prev, movement.id]));
    } catch (e) {
      console.error("Error importing movement", e);
    } finally {
      setImporting(null);
    }
  };

  const incomeTotal = movements.filter(m => m.type === "income").reduce((s, m) => s + m.amount, 0);
  const expenseTotal = movements.filter(m => m.type === "expense").reduce((s, m) => s + m.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-background to-background overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#009ee3]/10 border border-[#009ee3]/20">
            <Wallet className="w-5 h-5 text-[#009ee3]" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">MercadoPago</h3>
            <p className="text-xs text-muted-foreground">Tus últimos movimientos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchMovements}
            disabled={loading}
            className="h-8 px-3 text-xs gap-1.5 border-[#009ee3]/30 text-[#009ee3] hover:bg-[#009ee3]/10"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {movements.length > 0 ? "Actualizar" : "Sincronizar"}
          </Button>
          {movements.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-sm text-destructive"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Totals */}
      <AnimatePresence>
        {movements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="px-4 sm:px-5 pb-3 grid grid-cols-2 gap-3"
          >
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs text-muted-foreground mb-0.5">Ingresos</p>
              <p className="text-sm font-bold text-emerald-500">{formatAmount(incomeTotal, "ARS")}</p>
            </div>
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-muted-foreground mb-0.5">Egresos</p>
              <p className="text-sm font-bold text-red-500">{formatAmount(expenseTotal, "ARS")}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Movements list */}
      <AnimatePresence>
        {expanded && movements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border/50 divide-y divide-border/30 max-h-[360px] overflow-y-auto"
          >
            {movements.map((m) => {
              const isIncome = m.type === "income";
              const alreadyImported = imported.has(m.id);
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                >
                  {/* Icon */}
                  <div className={cn(
                    "p-1.5 rounded-lg shrink-0",
                    isIncome ? "bg-emerald-500/10" : "bg-red-500/10"
                  )}>
                    {isIncome
                      ? <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                      : <ArrowUpRight className="w-4 h-4 text-red-500" />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.description}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{m.category}</span>
                      <span>·</span>
                      <span>{formatDate(m.date)}</span>
                    </div>
                  </div>

                  {/* Amount + Import */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "text-sm font-bold",
                      isIncome ? "text-emerald-500" : "text-red-500"
                    )}>
                      {isIncome ? "+" : "-"}{formatAmount(m.amount, m.currency)}
                    </span>
                    {onImport && (
                      <button
                        onClick={() => handleImport(m)}
                        disabled={alreadyImported || importing === m.id}
                        className={cn(
                          "p-1 rounded-lg transition-colors",
                          alreadyImported
                            ? "text-emerald-500 bg-emerald-500/10 cursor-default"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                        title={alreadyImported ? "Ya importado" : "Agregar a mis movimientos"}
                      >
                        {importing === m.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Plus className="w-3.5 h-3.5" />
                        }
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty CTA */}
      {movements.length === 0 && !loading && !error && (
        <div className="px-5 pb-5 flex flex-col items-center text-center gap-2">
          <CreditCard className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">
            Tocá Sincronizar para importar tus movimientos de MercadoPago
          </p>
        </div>
      )}
    </motion.div>
  );
}
