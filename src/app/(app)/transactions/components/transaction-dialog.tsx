"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryIcon } from "@/components/category-icon";
import { useCreateTransaction, useUpdateTransaction } from "@/hooks/use-transactions";
import { useCreateRecurring } from "@/hooks/use-recurring";
import { useUISounds } from "@/hooks/use-ui-sounds";
import { createTransactionSchema, type CreateTransactionInput, type Transaction, type Category, type RecurringFrequency } from "@/types";
import { Loader2, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const frequencyLabels: Record<RecurringFrequency, string> = {
  daily: "Diario",
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  yearly: "Anual",
};

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  categories: Category[];
}

export function TransactionDialog({
  open,
  onOpenChange,
  transaction,
  categories,
}: TransactionDialogProps) {
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const createRecurring = useCreateRecurring();
  const { playSuccess } = useUISounds();
  const isEditing = !!transaction;

  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      type: "expense",
      amount: 0,
      description: "",
      categoryId: "",
      date: new Date(),
      tags: [],
      isRecurring: false,
      notes: "",
    },
  });

  const selectedType = watch("type");

  useEffect(() => {
    if (transaction) {
      reset({
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        categoryId: transaction.categoryId,
        date: new Date(transaction.date),
        tags: transaction.tags || [],
        isRecurring: transaction.isRecurring,
        notes: transaction.notes || "",
      });
      setRecurring(transaction.isRecurring);
    } else {
      reset({
        type: "expense",
        amount: 0,
        description: "",
        categoryId: "",
        date: new Date(),
        tags: [],
        isRecurring: false,
        notes: "",
      });
      setRecurring(false);
      setFrequency("monthly");
    }
  }, [transaction, reset, open]);

  const filteredCategories = categories.filter((c) => c.type === selectedType);

  const onSubmit = async (data: CreateTransactionInput) => {
    const txData = { ...data, isRecurring: recurring };

    if (isEditing) {
      await updateMutation.mutateAsync({ id: transaction.id, data: txData });
    } else {
      await createMutation.mutateAsync(txData);

      if (recurring) {
        const nextDate = new Date(data.date);
        switch (frequency) {
          case "daily": nextDate.setDate(nextDate.getDate() + 1); break;
          case "weekly": nextDate.setDate(nextDate.getDate() + 7); break;
          case "biweekly": nextDate.setDate(nextDate.getDate() + 14); break;
          case "monthly": nextDate.setMonth(nextDate.getMonth() + 1); break;
          case "yearly": nextDate.setFullYear(nextDate.getFullYear() + 1); break;
        }
        await createRecurring.mutateAsync({
          type: data.type,
          amount: data.amount,
          description: data.description,
          categoryId: data.categoryId,
          frequency,
          nextDate,
          isActive: true,
        });
      }
    }
    playSuccess();
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="text-lg font-semibold">
            {isEditing ? "Editar movimiento" : "Nuevo movimiento"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="px-5 pb-5 space-y-4">
          {/* Type Toggle */}
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <div className="flex rounded-xl bg-muted p-1 gap-1">
                {(["expense", "income"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => field.onChange(type)}
                    className={cn(
                      "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      field.value === type
                        ? type === "income"
                          ? "bg-success/15 text-success shadow-sm"
                          : "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {type === "income" ? "Ingreso" : "Gasto"}
                  </button>
                ))}
              </div>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Monto</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="h-11 rounded-xl tabular-nums"
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date">Fecha</Label>
              <Controller
                control={control}
                name="date"
                render={({ field }) => (
                  <Input
                    id="date"
                    type="date"
                    className="h-11 rounded-xl"
                    value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              placeholder="ej., Supermercado"
              className="h-11 rounded-xl"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Elegí una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />
                          <span>{cat.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && (
              <p className="text-xs text-destructive">{errors.categoryId.message}</p>
            )}
          </div>

          {/* Recurring toggle */}
          {!isEditing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 p-3">
                <div className="flex items-center gap-2.5">
                  <Repeat className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Recurrente</p>
                    <p className="text-[11px] text-muted-foreground">Se repite automáticamente</p>
                  </div>
                </div>
                <Switch checked={recurring} onCheckedChange={setRecurring} />
              </div>

              {recurring && (
                <div className="space-y-1.5">
                  <Label>Frecuencia</Label>
                  <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurringFrequency)}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(frequencyLabels) as [RecurringFrequency, string][]).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Agregá detalles adicionales..."
              className="rounded-xl resize-none"
              rows={2}
              {...register("notes")}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-xl"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEditing ? (
                "Guardar"
              ) : (
                "Agregar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
