"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { useAuth } from "@/hooks/use-auth";
import { useTransactions } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { useBudgets } from "@/hooks/use-budgets";
import { formatCurrency, formatMonth } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { MonthPicker } from "@/components/month-picker";
import { PageSkeleton } from "@/components/loading-skeleton";
import { SummaryCards } from "./components/summary-cards";
import { CategoryDonut } from "./components/category-donut";
import { MonthlyBars } from "./components/monthly-bars";
import { BalanceEvolution } from "./components/balance-evolution";
import { CategoryTrends } from "./components/category-trends";
import { InsightsPanel } from "./components/insights-panel";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import type { Transaction, Category } from "@/types";
import { filterRealTransactions } from "@/lib/transactions-utils";
import { toast } from "sonner";

function exportToCSV(transactions: Transaction[], categories: Category[], monthLabel: string) {
  const header = "Fecha,Tipo,Descripción,Categoría,Monto,Notas\n";
  const rows = transactions
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((t) => {
      const d = new Date(t.date);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const type = t.type === "income" ? "Ingreso" : "Gasto";
      const cat = categories.find((c) => c.id === t.categoryId)?.name || "Sin categoría";
      const desc = `"${t.description.replace(/"/g, '""')}"`;
      const notes = t.notes ? `"${t.notes.replace(/"/g, '""')}"` : "";
      return `${date},${type},${desc},${cat},${t.amount},${notes}`;
    })
    .join("\n");

  const bom = "\uFEFF";
  const blob = new Blob([bom + header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `financia-${monthLabel.replace(/\s/g, "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success("CSV exportado correctamente");
}

export default function ReportsPage() {
  const { settings } = useAuth();
  const currency = settings?.currency ?? "ARS";
  const now = new Date();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: monthTransactions, isLoading: loadingMonth } = useTransactions({ month, year });
  const { data: allTransactions, isLoading: loadingAll } = useTransactions();
  const { data: categories, isLoading: loadingCat } = useCategories();
  const { data: budgets } = useBudgets(month, year);

  const isLoading = loadingMonth || loadingAll || loadingCat;

  const handleExport = useCallback(() => {
    if (!monthTransactions || !categories) return;
    const label = formatMonth(month, year);
    exportToCSV(monthTransactions, categories, label);
  }, [monthTransactions, categories, month, year]);

  if (isLoading) return <PageSkeleton />;

  const realMonthTx = filterRealTransactions(monthTransactions ?? []);
  const realAllTx = filterRealTransactions(allTransactions ?? []);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-6 lg:p-8 space-y-4"
    >
      <PageHeader
        title="Reportes"
        description="Analizá tus finanzas en detalle"
      >
        <Button
          onClick={handleExport}
          variant="outline"
          className="rounded-xl gap-2"
          disabled={!monthTransactions?.length}
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Exportar CSV</span>
          <span className="sm:hidden">CSV</span>
        </Button>
      </PageHeader>

      <motion.div variants={fadeInUp}>
        <MonthPicker
          month={month}
          year={year}
          onChange={(m, y) => {
            setMonth(m);
            setYear(y);
          }}
        />
      </motion.div>

      <motion.div variants={fadeInUp}>
        <SummaryCards
          transactions={realMonthTx}
          allTransactions={realAllTx}
          currency={currency}
          month={month}
          year={year}
        />
      </motion.div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div variants={fadeInUp}>
          <CategoryDonut
          transactions={realMonthTx}
          categories={categories || []}
          currency={currency}
          type="expense"
        />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <CategoryDonut
            transactions={realMonthTx}
            categories={categories || []}
            currency={currency}
            type="income"
          />
        </motion.div>
      </div>

      {/* Insights */}
      <motion.div variants={fadeInUp}>
        <InsightsPanel
          transactions={realAllTx}
          categories={categories || []}
          budgets={budgets || []}
          currency={currency}
          month={month}
          year={year}
        />
      </motion.div>

      {/* Charts Row 2 - Full width */}
      <motion.div variants={fadeInUp}>
        <MonthlyBars
          transactions={realAllTx}
          currency={currency}
        />
      </motion.div>

      <motion.div variants={fadeInUp}>
        <BalanceEvolution
          transactions={realAllTx}
          currency={currency}
        />
      </motion.div>

      <motion.div variants={fadeInUp}>
        <CategoryTrends
          transactions={realAllTx}
          categories={categories || []}
          currency={currency}
        />
      </motion.div>
    </motion.div>
  );
}
