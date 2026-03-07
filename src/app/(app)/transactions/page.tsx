"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { useTransactions } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { MonthPicker } from "@/components/month-picker";
import { CategoryIcon } from "@/components/category-icon";
import { EmptyState } from "@/components/empty-state";
import { TransactionListSkeleton } from "@/components/loading-skeleton";
import { TransactionDialog } from "./components/transaction-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SwipeableRow } from "@/components/swipeable-row";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { filterRealTransactions } from "@/lib/transactions-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  ArrowLeftRight,
  Repeat,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDeleteTransaction, useCreateTransaction } from "@/hooks/use-transactions";
import { useUISounds } from "@/hooks/use-ui-sounds";
import type { Transaction } from "@/types";

export default function TransactionsPage() {
  const { settings } = useAuth();
  const { playPop, playDelete } = useUISounds();
  const currency = settings?.currency ?? "ARS";
  const now = new Date();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const searchParams = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditingTx(null);
      setDialogOpen(true);
      window.history.replaceState(null, "", "/transactions");
    }
  }, [searchParams]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: transactions, isLoading, refetch } = useTransactions({ month, year });
  const { data: categories } = useCategories();
  const deleteMutation = useDeleteTransaction();
  const createMutation = useCreateTransaction();

  const monthSummary = useMemo(() => {
    if (!transactions) return { income: 0, expenses: 0 };
    const real = filterRealTransactions(transactions);
    const income = real.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenses = real.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { income, expenses };
  }, [transactions]);

  const filtered = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter((tx) => {
      if (search && !tx.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (categoryFilter !== "all" && tx.categoryId !== categoryFilter) return false;
      return true;
    });
  }, [transactions, search, typeFilter, categoryFilter]);

  const txToDelete = useMemo(() => (deleteId && filtered ? filtered.find((t) => t.id === deleteId) : null), [deleteId, filtered]);

  const grouped = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filtered.forEach((tx) => {
      const key = formatDate(new Date(tx.date));
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });
    return Object.entries(groups);
  }, [filtered]);

  const getCat = (id: string) => categories?.find((c) => c.id === id);

  const handleEdit = (tx: Transaction) => {
    playPop();
    setEditingTx(tx);
    setDialogOpen(true);
  };

  const handleNew = () => {
    playPop();
    setEditingTx(null);
    setDialogOpen(true);
  };

  return (
    <PullToRefresh onRefresh={() => refetch()}>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="p-4 sm:p-6 lg:p-8 space-y-4"
      >
      <PageHeader
        title="Movimientos"
        description="Controlá todos tus ingresos y gastos"
      >
        <div className="flex items-center gap-2">
          <Link href="/transactions/import">
            <Button variant="outline" className="rounded-xl gap-2">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Importar CSV</span>
              <span className="sm:hidden">Importar</span>
            </Button>
          </Link>
          <Button onClick={handleNew} className="rounded-xl gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Agregar movimiento</span>
            <span className="sm:hidden">Agregar</span>
          </Button>
        </div>
      </PageHeader>

      {/* Month Navigation */}
      <motion.div variants={fadeInUp}>
        <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
      </motion.div>

      {/* Month Summary */}
      <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ingresos</p>
          <p className="text-base font-bold tabular-nums text-success mt-0.5">
            +{formatCurrency(monthSummary.income, currency)}
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Gastos</p>
          <p className="text-base font-bold tabular-nums text-destructive mt-0.5">
            -{formatCurrency(monthSummary.expenses, currency)}
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar movimientos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl"
          />
        </div>
        <div className="flex gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[130px] h-10 rounded-xl">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Ingreso</SelectItem>
              <SelectItem value="expense">Gasto</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[160px] h-10 rounded-xl">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Transaction List */}
      {isLoading ? (
        <TransactionListSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No se encontraron movimientos"
          description={
            search || typeFilter !== "all" || categoryFilter !== "all"
              ? "Probá ajustando los filtros."
              : "Agregá tu primer movimiento para empezar a controlar tus finanzas."
          }
          action={
            !search && typeFilter === "all" && categoryFilter === "all"
              ? { label: "Agregar movimiento", onClick: handleNew }
              : undefined
          }
        />
      ) : (
        <motion.div variants={fadeInUp} className="space-y-4">
          {grouped.map(([date, txs]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                {date}
              </h3>
              <div className="space-y-1 rounded-xl border border-border/50 bg-card overflow-hidden">
                {txs.map((tx) => {
                  const cat = getCat(tx.categoryId);
                  return (
                    <SwipeableRow
                      key={tx.id}
                      onEdit={() => handleEdit(tx)}
                      onDelete={() => setDeleteId(tx.id)}
                    >
                      <div
                        className="flex items-center gap-3 p-3 active:bg-muted/40 hover:bg-muted/30 transition-colors"
                        onClick={() => handleEdit(tx)}
                      >
                        <CategoryIcon
                          icon={cat?.icon || "Circle"}
                          color={cat?.color || "#94a3b8"}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">{tx.description}</p>
                            {tx.isRecurring && (
                              <Repeat className="w-3 h-3 text-muted-foreground shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {cat?.name || "Sin categoría"}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-sm font-semibold tabular-nums whitespace-nowrap",
                            tx.type === "income" ? "text-success" : ""
                          )}
                        >
                          {tx.type === "income" ? "+" : "-"}
                          {formatCurrency(tx.amount, currency)}
                        </span>
                      </div>
                    </SwipeableRow>
                  );
                })}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transaction={editingTx}
        categories={categories || []}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Eliminar movimiento"
        description="¿Estás seguro de que querés eliminar este movimiento?"
        confirmLabel="Eliminar"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteId || !txToDelete) return;
          deleteMutation.mutate(
            { id: deleteId, tx: txToDelete },
            {
              onSuccess: () => {
                playDelete();
                setDeleteId(null);
                toast.success("Movimiento eliminado", {
                  action: {
                    label: "Deshacer",
                    onClick: () => {
                      createMutation.mutate({
                        type: txToDelete.type,
                        amount: txToDelete.amount,
                        description: txToDelete.description,
                        categoryId: txToDelete.categoryId,
                        date: new Date(txToDelete.date),
                        tags: txToDelete.tags ?? [],
                        isRecurring: txToDelete.isRecurring ?? false,
                        notes: txToDelete.notes ?? "",
                      });
                      toast.success("Movimiento restaurado");
                    },
                  },
                });
              },
            }
          );
        }}
      />
    </motion.div>
    </PullToRefresh>
  );
}
