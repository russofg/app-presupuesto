"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { useDolarRates } from "@/hooks/use-dolar-rates";
import { getRateByCasa } from "@/lib/dolar-api";
import { DollarSign, RefreshCw, Loader2, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";

export function DollarConverter() {
  const { data: rates, isLoading, isError, refetch, isFetching } = useDolarRates();
  const [pesos, setPesos] = useState("");

  const oficial = rates ? getRateByCasa(rates, "oficial") : null;
  const mep = rates ? getRateByCasa(rates, "bolsa") : null;

  const parsedPesos = useMemo(() => {
    const parts = pesos.split(/[.,]/);
    if (parts.length === 1) return parseFloat(parts[0].replace(/\D/g, "")) || 0;
    const intPart = parts.slice(0, -1).join("").replace(/\D/g, "");
    const decPart = parts[parts.length - 1].replace(/\D/g, "").slice(0, 2);
    return parseFloat(`${intPart}.${decPart}`) || 0;
  }, [pesos]);

  const usdOficial = oficial && parsedPesos > 0 ? parsedPesos / oficial.venta : 0;
  const usdMep = mep && parsedPesos > 0 ? parsedPesos / mep.venta : 0;

  const formatPesos = (n: number) =>
    new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  const formatUsd = (n: number) =>
    new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  if (isError) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-5">
        <p className="text-sm text-muted-foreground">No se pudieron cargar las cotizaciones.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-border/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-500" />
          Cotización del dólar
        </h3>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          title="Actualizar"
        >
          {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Current rates */}
            <div className="grid grid-cols-2 gap-3">
              {oficial && (
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                    Oficial
                  </p>
                  <p className="text-sm font-semibold tabular-nums">
                    ${formatPesos(oficial.venta)} <span className="text-muted-foreground font-normal text-xs">/ USD</span>
                  </p>
                </div>
              )}
              {mep && (
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                    MEP (Bolsa)
                  </p>
                  <p className="text-sm font-semibold tabular-nums">
                    ${formatPesos(mep.venta)} <span className="text-muted-foreground font-normal text-xs">/ USD</span>
                  </p>
                </div>
              )}
            </div>

            {/* Converter */}
            <div className="space-y-3 pt-2 border-t border-border/50">
              <label className="text-xs font-medium text-muted-foreground">
                ¿Cuántos pesos tenés?
              </label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="ej. 500000"
                value={pesos}
                onChange={(e) => setPesos(e.target.value)}
                className="h-11 rounded-xl text-base tabular-nums font-medium"
              />

              {parsedPesos > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2 pt-2"
                >
                  <p className="text-[11px] text-muted-foreground">
                    Con <span className="font-semibold text-foreground">{formatPesos(parsedPesos)}</span> pesos comprarías aprox.:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {oficial && (
                      <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2.5">
                        <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">Oficial</p>
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatUsd(usdOficial)} USD
                          </p>
                        </div>
                      </div>
                    )}
                    {mep && (
                      <div className="flex items-center gap-2 rounded-xl bg-sky-500/10 px-3 py-2.5">
                        <TrendingUp className="w-4 h-4 text-sky-500 shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">MEP</p>
                          <p className="text-sm font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                            {formatUsd(usdMep)} USD
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
