"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { useAuth } from "@/hooks/use-auth";
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from "@/hooks/use-goals";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/empty-state";
import { PageSkeleton } from "@/components/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Target, Trash2, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { fireGoalConfetti } from "@/lib/confetti";
import type { SavingsGoal } from "@/types";

const goalColors = ["#8b5cf6", "#06b6d4", "#10b981", "#f97316", "#ec4899", "#3b82f6", "#eab308"];
const goalIcons = ["🎯", "🏠", "✈️", "🚗", "💻", "🎓", "💍", "🏖️", "📱", "💰"];

export default function GoalsPage() {
  const { settings } = useAuth();
  const currency = settings?.currency ?? "ARS";

  const { data: goals, isLoading } = useGoals();
  const createMutation = useCreateGoal();
  const updateMutation = useUpdateGoal();
  const deleteMutation = useDeleteGoal();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [addFundsGoal, setAddFundsGoal] = useState<SavingsGoal | null>(null);
  const [withdrawGoal, setWithdrawGoal] = useState<SavingsGoal | null>(null);
  const [addAmount, setAddAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [selectedColor, setSelectedColor] = useState(goalColors[0]);
  const [selectedIcon, setSelectedIcon] = useState(goalIcons[0]);
  const [deadline, setDeadline] = useState("");

  const handleCreate = async () => {
    if (!name || !targetAmount) return;
    await createMutation.mutateAsync({
      name,
      targetAmount: parseFloat(targetAmount),
      icon: selectedIcon,
      color: selectedColor,
      deadline: deadline ? new Date(deadline) : undefined,
    });
    setDialogOpen(false);
    resetForm();
  };

  const handleAddFunds = async () => {
    if (!addFundsGoal || !addAmount) return;
    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) return;
    const newAmount = addFundsGoal.currentAmount + amount;
    const wasIncomplete = addFundsGoal.currentAmount < addFundsGoal.targetAmount;
    const isNowComplete = newAmount >= addFundsGoal.targetAmount;
    await updateMutation.mutateAsync({
      id: addFundsGoal.id,
      data: { currentAmount: newAmount },
    });
    if (wasIncomplete && isNowComplete) {
      setTimeout(() => fireGoalConfetti(), 300);
    }
    setAddFundsGoal(null);
    setAddAmount("");
  };

  const handleWithdraw = async () => {
    if (!withdrawGoal || !withdrawAmount) return;
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) return;
    if (amount > withdrawGoal.currentAmount) return;
    await updateMutation.mutateAsync({
      id: withdrawGoal.id,
      data: { currentAmount: withdrawGoal.currentAmount - amount },
    });
    setWithdrawGoal(null);
    setWithdrawAmount("");
  };

  const resetForm = () => {
    setName("");
    setTargetAmount("");
    setSelectedColor(goalColors[0]);
    setSelectedIcon(goalIcons[0]);
    setDeadline("");
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-6 lg:p-8 space-y-6"
    >
      <PageHeader title="Metas" description="Seguí tu progreso hacia tus metas financieras">
        <Button onClick={() => setDialogOpen(true)} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" />
          Nueva meta
        </Button>
      </PageHeader>

      {!goals || goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Todavía no hay metas"
          description="Configurá tu primera meta y empezá a seguir tu progreso."
          action={{ label: "Crear meta", onClick: () => setDialogOpen(true) }}
        />
      ) : (
        <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const percentage = goal.targetAmount > 0
              ? (goal.currentAmount / goal.targetAmount) * 100
              : 0;
            const isComplete = percentage >= 100;

            return (
              <motion.div
                key={goal.id}
                layout
                whileHover={{ y: -2 }}
                className="rounded-xl border border-border/50 bg-card p-5 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${goal.color}18` }}
                    >
                      {goal.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold">{goal.name}</h4>
                      {goal.deadline && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Vence {format(new Date(goal.deadline), "d MMM yyyy", { locale: es })}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(goal.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold tabular-nums">
                      {formatPercentage(percentage)}
                    </span>
                    {isComplete && (
                      <span className="text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                        ¡Completa!
                      </span>
                    )}
                  </div>

                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: goal.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(percentage, 100)}%` }}
                      transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium tabular-nums">
                      {formatCurrency(goal.currentAmount, currency)}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatCurrency(goal.targetAmount, currency)}
                    </span>
                  </div>

                  <div className="flex gap-2 mt-2">
                    {!isComplete && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-xl gap-1.5"
                        onClick={() => {
                          setAddFundsGoal(goal);
                          setAddAmount("");
                        }}
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        Agregar
                      </Button>
                    )}
                    {goal.currentAmount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-xl gap-1.5 text-muted-foreground"
                        onClick={() => {
                          setWithdrawGoal(goal);
                          setWithdrawAmount("");
                        }}
                      >
                        <TrendingDown className="w-3.5 h-3.5" />
                        Retirar
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nueva meta de ahorro</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label>Nombre de la meta</Label>
              <Input
                placeholder="ej., Fondo de emergencia"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Monto objetivo</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="h-11 rounded-xl tabular-nums"
              />
            </div>

            <div className="space-y-2">
              <Label>Ícono</Label>
              <div className="flex flex-wrap gap-2">
                {goalIcons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setSelectedIcon(icon)}
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-lg border-2 transition-all",
                      selectedIcon === icon
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:border-border"
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {goalColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      selectedColor === color ? "ring-2 ring-offset-2 ring-offset-background" : ""
                    )}
                    style={{ backgroundColor: color, ["--tw-ring-color" as string]: color }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fecha límite (opcional)</Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 rounded-xl">
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!name || !targetAmount || createMutation.isPending}
                className="flex-1 rounded-xl"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear meta"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Funds Dialog */}
      <Dialog open={!!addFundsGoal} onOpenChange={() => setAddFundsGoal(null)}>
        <DialogContent className="sm:max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Agregar fondos a {addFundsGoal?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                className="h-11 rounded-xl tabular-nums"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setAddFundsGoal(null)} className="flex-1 rounded-xl">
                Cancelar
              </Button>
              <Button
                onClick={handleAddFunds}
                disabled={!addAmount || updateMutation.isPending}
                className="flex-1 rounded-xl"
              >
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Agregar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Funds Dialog */}
      <Dialog open={!!withdrawGoal} onOpenChange={() => setWithdrawGoal(null)}>
        <DialogContent className="sm:max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Retirar fondos de {withdrawGoal?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Disponible: {formatCurrency(withdrawGoal?.currentAmount ?? 0, currency)}
            </p>
            <div className="space-y-2">
              <Label>Monto a retirar</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="h-11 rounded-xl tabular-nums"
                autoFocus
              />
              {withdrawGoal && parseFloat(withdrawAmount) > withdrawGoal.currentAmount && (
                <p className="text-xs text-destructive">No podés retirar más de lo que tenés ahorrado.</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setWithdrawGoal(null)} className="flex-1 rounded-xl">
                Cancelar
              </Button>
              <Button
                onClick={handleWithdraw}
                disabled={
                  !withdrawAmount ||
                  parseFloat(withdrawAmount) <= 0 ||
                  parseFloat(withdrawAmount) > (withdrawGoal?.currentAmount ?? 0) ||
                  updateMutation.isPending
                }
                className="flex-1 rounded-xl"
              >
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Retirar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Eliminar meta"
        description="¿Estás seguro de que querés eliminar esta meta de ahorro? Se perderá todo el progreso."
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId);
            setDeleteId(null);
          }
        }}
      />
    </motion.div>
  );
}
