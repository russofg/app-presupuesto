"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { formatCurrency } from "@/lib/format";
import type { Currency } from "@/types";
import type { SavingsGoal } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PiggyBank, Wallet } from "lucide-react";
import { useUpdateGoal } from "@/hooks/use-goals";
import { useAuth } from "@/hooks/use-auth";
import { addDeficitCovered } from "@/lib/services/firestore";
import { toast } from "sonner";

interface CoverDeficitCardProps {
  deficit: number;
  deficitCovered: number;
  savings: number;
  goals: SavingsGoal[];
  currency: Currency;
  month: number;
  year: number;
}

export function CoverDeficitCard({ deficit, deficitCovered, savings, goals, currency, month, year }: CoverDeficitCardProps) {
  const [open, setOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [amount, setAmount] = useState("");
  const [covering, setCovering] = useState(false);
  const { user, refreshSettings } = useAuth();
  const updateMutation = useUpdateGoal();

  const remainingDeficit = Math.max(0, deficit - deficitCovered);
  const goalsWithBalance = goals.filter((g) => g.currentAmount > 0);
  const canCover = remainingDeficit > 0 && savings >= remainingDeficit && goalsWithBalance.length > 0;

  if (!canCover) return null;

  const parseAmount = (s: string) => {
    const cleaned = s.replace(/\./g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  const handleCover = async () => {
    const goal = goals.find((g) => g.id === selectedGoalId);
    if (!goal || !amount || !user) return;
    const value = parseAmount(amount);
    if (value <= 0) return;
    if (value > goal.currentAmount) {
      toast.error("El monto supera el saldo de la meta");
      return;
    }
    const toCover = Math.min(value, remainingDeficit);
    setCovering(true);

    try {
      await updateMutation.mutateAsync({
        id: goal.id,
        data: { currentAmount: goal.currentAmount - toCover },
      });

      await addDeficitCovered(user.uid, month, year, toCover);
      await refreshSettings();

      toast.success(`Cubriste ${formatCurrency(toCover, currency)} del déficit con "${goal.name}"`);
      setOpen(false);
      setSelectedGoalId("");
      setAmount("");
    } finally {
      setCovering(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Tenés un déficit este mes</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                Podés cubrirlo con tus ahorros ({formatCurrency(savings, currency)} disponibles). Te faltan {formatCurrency(remainingDeficit, currency)}.
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              setSelectedGoalId(goalsWithBalance[0]?.id ?? "");
              setAmount(String(Math.min(remainingDeficit, goalsWithBalance[0]?.currentAmount ?? 0)));
              setOpen(true);
            }}
            variant="outline"
            className="rounded-xl shrink-0 border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
          >
            <PiggyBank className="w-4 h-4 mr-2" />
            Cubrir con ahorros
          </Button>
        </div>
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cubrir déficit con ahorros</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Déficit restante: <span className="font-semibold text-foreground">{formatCurrency(remainingDeficit, currency)}</span>
            </p>
            <div className="space-y-2">
              <Label>De qué meta querés retirar</Label>
              <select
                value={selectedGoalId}
                onChange={(e) => {
                  setSelectedGoalId(e.target.value);
                  const g = goals.find((x) => x.id === e.target.value);
                  if (g) setAmount(String(Math.min(remainingDeficit, g.currentAmount)));
                }}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">Elegí una meta</option>
                {goalsWithBalance.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.icon} {g.name} — {formatCurrency(g.currentAmount, currency)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Monto a retirar</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <Button
              onClick={handleCover}
              disabled={!selectedGoalId || !amount || updateMutation.isPending || covering}
              className="w-full rounded-xl"
            >
              {updateMutation.isPending || covering ? "Procesando..." : "Cubrir déficit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
