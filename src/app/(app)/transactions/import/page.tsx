"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { useAuth } from "@/hooks/use-auth";
import { useCategories } from "@/hooks/use-categories";
import { createTransaction } from "@/lib/services/firestore";
import { parseCSV, suggestCategory, type ParsedTransaction } from "@/lib/csv-parser";
import { formatCurrency, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  Check,
  X,
  Loader2,
  ArrowLeft,
  AlertTriangle,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ImportRow extends ParsedTransaction {
  id: string;
  categoryId: string;
  selected: boolean;
}

type Step = "upload" | "preview" | "importing" | "done";

export default function ImportPage() {
  const { user, settings } = useAuth();
  const { data: categories } = useCategories();
  const currency = settings?.currency ?? "ARS";

  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [format, setFormat] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultCategoryId = categories?.find((c) => c.name === "Otros")?.id ?? "";

  const processFile = useCallback((file: File) => {
    if (!file.name.match(/\.(csv|txt|tsv)$/i)) {
      toast.error("Solo se aceptan archivos CSV, TSV o TXT");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        toast.error("No se pudo leer el archivo");
        return;
      }

      const result = parseCSV(text);
      setErrors(result.errors);
      setFormat(result.format === "mercadopago" ? "Mercado Pago" : "Genérico");

      if (result.transactions.length === 0) {
        toast.error("No se encontraron movimientos válidos en el archivo");
        return;
      }

      const importRows: ImportRow[] = result.transactions.map((tx, i) => ({
        ...tx,
        id: `import-${i}`,
        categoryId: (categories ? suggestCategory(tx.description, categories) : null) ?? defaultCategoryId,
        selected: true,
      }));

      setRows(importRows);
      setStep("preview");
      toast.success(`${importRows.length} movimientos encontrados`);
    };

    reader.readAsText(file, "UTF-8");
  }, [categories, defaultCategoryId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const toggleRow = (id: string) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, selected: !r.selected } : r));
  };

  const toggleAll = () => {
    const allSelected = rows.every((r) => r.selected);
    setRows((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
  };

  const updateCategory = (id: string, categoryId: string) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, categoryId } : r));
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const selectedRows = rows.filter((r) => r.selected);
  const totalIncome = selectedRows.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const totalExpense = selectedRows.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);

  const handleImport = async () => {
    if (!user || selectedRows.length === 0) return;
    setStep("importing");
    setProgress(0);

    let imported = 0;
    const total = selectedRows.length;

    for (const row of selectedRows) {
      try {
        await createTransaction(user.uid, {
          type: row.type,
          amount: row.amount,
          description: row.description.slice(0, 200),
          categoryId: row.categoryId || defaultCategoryId,
          date: row.date,
          tags: ["importado"],
          isRecurring: false,
          notes: `Importado desde CSV (${format})`,
        });
        imported++;
      } catch {
        // skip failed rows silently
      }
      setProgress(Math.round(((imported) / total) * 100));
    }

    setImportedCount(imported);
    setStep("done");
    toast.success(`${imported} movimientos importados correctamente`);
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-4xl"
    >
      <PageHeader
        title="Importar movimientos"
        description="Cargá un archivo CSV desde Mercado Pago, tu banco o cualquier planilla"
      >
        <Link href="/transactions">
          <Button variant="outline" className="rounded-xl gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
        </Link>
      </PageHeader>

      <AnimatePresence mode="wait">
        {/* ─── Step 1: Upload ─── */}
        {step === "upload" && (
          <motion.div
            key="upload"
            variants={fadeInUp}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -10 }}
          >
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300",
                dragOver
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border/50 hover:border-border hover:bg-muted/30"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.tsv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <motion.div
                animate={dragOver ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Arrastrá tu archivo CSV acá
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  o hacé clic para seleccionarlo
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Formatos: CSV, TSV, TXT
                </div>
              </motion.div>
            </div>

            <div className="mt-6 rounded-xl border border-border/50 bg-card p-5">
              <h4 className="text-sm font-semibold mb-3">¿Cómo exportar desde Mercado Pago?</h4>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  Entrá a <strong className="text-foreground">mercadopago.com.ar</strong> desde el navegador
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  Andá a <strong className="text-foreground">Actividad</strong> en el menú
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  Hacé clic en <strong className="text-foreground">Descargar reporte</strong> o <strong className="text-foreground">Exportar</strong>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">4</span>
                  Elegí formato <strong className="text-foreground">CSV</strong> y el rango de fechas
                </li>
              </ol>
            </div>
          </motion.div>
        )}

        {/* ─── Step 2: Preview ─── */}
        {step === "preview" && (
          <motion.div
            key="preview"
            variants={fadeInUp}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Summary bar */}
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-card p-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Formato: {format}</span>
              </div>
              <div className="h-4 w-px bg-border/50" />
              <span className="text-sm text-muted-foreground">
                {selectedRows.length} de {rows.length} seleccionados
              </span>
              <div className="h-4 w-px bg-border/50" />
              <span className="text-sm text-emerald-500 font-medium tabular-nums">
                +{formatCurrency(totalIncome, currency)}
              </span>
              <span className="text-sm text-rose-500 font-medium tabular-nums">
                -{formatCurrency(totalExpense, currency)}
              </span>
            </div>

            {errors.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    {errors.length} {errors.length === 1 ? "advertencia" : "advertencias"}
                  </span>
                </div>
                <ul className="space-y-1">
                  {errors.slice(0, 5).map((err, i) => (
                    <li key={i} className="text-xs text-muted-foreground">{err}</li>
                  ))}
                  {errors.length > 5 && (
                    <li className="text-xs text-muted-foreground">...y {errors.length - 5} más</li>
                  )}
                </ul>
              </div>
            )}

            {/* Select all */}
            <div className="flex items-center justify-between">
              <button
                onClick={toggleAll}
                className="text-xs font-medium text-primary hover:underline"
              >
                {rows.every((r) => r.selected) ? "Deseleccionar todos" : "Seleccionar todos"}
              </button>
            </div>

            {/* Transactions list */}
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden divide-y divide-border/50 max-h-[500px] overflow-y-auto">
              {rows.map((row) => {
                const cat = categories?.find((c) => c.id === row.categoryId);
                return (
                  <div
                    key={row.id}
                    className={cn(
                      "flex items-center gap-3 p-3 transition-colors",
                      row.selected ? "bg-transparent" : "bg-muted/20 opacity-50"
                    )}
                  >
                    <button
                      onClick={() => toggleRow(row.id)}
                      className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                        row.selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {row.selected && <Check className="w-3 h-3" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{row.description}</p>
                      <p className="text-[11px] text-muted-foreground">{formatDate(row.date)}</p>
                    </div>

                    <Select
                      value={row.categoryId}
                      onValueChange={(v) => updateCategory(row.id, v)}
                    >
                      <SelectTrigger className="h-8 w-[140px] rounded-lg text-xs shrink-0">
                        <SelectValue>
                          {cat && (
                            <div className="flex items-center gap-1.5">
                              <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />
                              <span className="truncate">{cat.name}</span>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {categories
                          ?.filter((c) => c.type === row.type)
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              <div className="flex items-center gap-1.5">
                                <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                                <span>{c.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    <span className={cn(
                      "text-sm font-semibold tabular-nums whitespace-nowrap",
                      row.type === "income" ? "text-emerald-500" : "text-foreground"
                    )}>
                      {row.type === "income" ? "+" : "-"}{formatCurrency(row.amount, currency)}
                    </span>

                    <button
                      onClick={() => removeRow(row.id)}
                      className="p-1 rounded-md text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setStep("upload"); setRows([]); setErrors([]); }}
                className="rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedRows.length === 0}
                className="flex-1 rounded-xl gap-2"
              >
                <Upload className="w-4 h-4" />
                Importar {selectedRows.length} movimientos
              </Button>
            </div>
          </motion.div>
        )}

        {/* ─── Step 3: Importing ─── */}
        {step === "importing" && (
          <motion.div
            key="importing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Importando movimientos...</h3>
            <p className="text-sm text-muted-foreground mb-6">{progress}% completado</p>
            <div className="w-64 h-2 bg-muted rounded-full overflow-hidden mx-auto">
              <motion.div
                className="h-full rounded-full bg-primary"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}

        {/* ─── Step 4: Done ─── */}
        {step === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
            </motion.div>
            <h3 className="text-lg font-semibold mb-2">¡Importación completa!</h3>
            <p className="text-sm text-muted-foreground mb-8">
              Se importaron <strong>{importedCount}</strong> movimientos correctamente.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => { setStep("upload"); setRows([]); setErrors([]); setProgress(0); }}
                className="rounded-xl"
              >
                Importar más
              </Button>
              <Link href="/transactions">
                <Button className="rounded-xl gap-2">
                  <Check className="w-4 h-4" />
                  Ver movimientos
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
