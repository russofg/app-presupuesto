"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { formatCurrency } from "@/lib/format";
import type { Currency } from "@/types";
import type { SavingsGoal } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RotateCcw } from "lucide-react";
import { useUpdateGoal } from "@/hooks/use-goals";
import { useAuth } from "@/hooks/use-auth";
import { setDeficitCovered } from "@/lib/services/firestore";
import { toast } from "sonner";

interface RefundExcessCardProps {
  deficit: number;
  deficitCovered: number;
  goals: SavingsGoal[];
  currency: Currency;
  month: number;
  year: number;
  onRefunded: () => void;
}

export function RefundExcessCard({
  deficit,
  deficitCovered,
  goals,
  currency,
  month,
  year,
  onRefunded,
}: RefundExcessCardProps) {
  const [open, setOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [refunding, setRefunding] = useState(false);
  const { user, refreshSettings } = useAuth();
  const updateMutation = useUpdateGoal();

  const excess = deficitCovered - deficit;
  const canRefund = excess > 0 && goals.length > 0 && user;

  if (!canRefund) return null;

  const handleRefund = async (refundAll: boolean) => {
    if (!selectedGoalId || !user) return;
    const goal = goals.find((g) => g.id === selectedGoalId);
    if (!goal) return;

    const amountToRefund = refundAll ? deficitCovered : excess;
    const newDeficitCovered = refundAll ? 0 : deficit;

    setRefunding(true);
    try {
      await updateMutation.mutateAsync({
        id: goal.id,
        data: { currentAmount: goal.currentAmount + amountToRefund },
      });
      await setDeficitCovered(user.uid, month, year, newDeficitCovered);
      await refreshSettings();
      onRefunded();
      toast.success(`Devolviste ${formatCurrency(amountToRefund, currency)} a "${goal.name}"`);
      setOpen(false);
    } finally {
      setRefunding(false);
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
              <RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Se cubrió de más el déficit</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                Se retiraron {formatCurrency(deficitCovered, currency)} de tus metas pero el déficit era solo {formatCurrency(deficit, currency)}. 
                Podés devolver {formatCurrency(excess, currency)} a tus metas.
                {deficitCovered > excess && (
                  <span className="block mt-1">O devolver todo ({formatCurrency(deficitCovered, currency)}) para volver a tener lo que tenías.</span>
                )}
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              setSelectedGoalId(goals[0]?.id ?? "");
              setOpen(true);
            }}
            variant="outline"
            className="rounded-xl shrink-0 border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Devolver a metas
          </Button>
        </div>
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Devolver exceso a metas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Elegí cuánto devolver y a qué meta.
            </p>
            <div className="space-y-2">
              <Label>A qué meta devolver</Label>
              <select
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">Elegí una meta</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.icon} {g.name} — {formatCurrency(g.currentAmount, currency)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleRefund(false)}
                disabled={!selectedGoalId || updateMutation.isPending || refunding}
                variant="outline"
                className="flex-1 rounded-xl"
              >
                {updateMutation.isPending || refunding ? "..." : `Devolver exceso (${formatCurrency(excess, currency)})`}
              </Button>
              <Button
                onClick={() => handleRefund(true)}
                disabled={!selectedGoalId || updateMutation.isPending || refunding}
                className="flex-1 rounded-xl"
              >
                {updateMutation.isPending || refunding ? "..." : `Devolver todo (${formatCurrency(deficitCovered, currency)})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
