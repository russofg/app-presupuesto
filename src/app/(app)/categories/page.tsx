"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/use-categories";
import { PageHeader } from "@/components/layout/page-header";
import { CategoryIcon } from "@/components/category-icon";
import { EmptyState } from "@/components/empty-state";
import { PageSkeleton } from "@/components/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Tags, Trash2, Pencil, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";
import type { TransactionType, Category } from "@/types";

const iconOptions = [
  "Home", "Car", "UtensilsCrossed", "ShoppingBag", "Heart", "Briefcase",
  "Laptop", "GraduationCap", "Zap", "Clapperboard", "CreditCard",
  "TrendingUp", "PiggyBank", "Gift", "Plane", "Music", "Dumbbell",
  "Coffee", "Shirt", "Phone",
];

const colorOptions = [
  "#ef4444", "#f97316", "#eab308", "#10b981", "#06b6d4",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
  "#78716c", "#14b8a6",
];

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(iconOptions[0]);
  const [selectedColor, setSelectedColor] = useState(colorOptions[0]);
  const [selectedType, setSelectedType] = useState<TransactionType>("expense");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSelectedIcon(cat.icon);
    setSelectedColor(cat.color);
    setSelectedType(cat.type);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingCategory(null);
    setName("");
    setSelectedIcon(iconOptions[0]);
    setSelectedColor(colorOptions[0]);
    setSelectedType("expense");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name) return;
    if (editingCategory) {
      await updateMutation.mutateAsync({
        id: editingCategory.id,
        data: { name, icon: selectedIcon, color: selectedColor, type: selectedType },
      });
    } else {
      await createMutation.mutateAsync({
        name,
        icon: selectedIcon,
        color: selectedColor,
        type: selectedType,
      });
    }
    setDialogOpen(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const incomeCategories = categories?.filter((c) => c.type === "income") ?? [];
  const expenseCategories = categories?.filter((c) => c.type === "expense") ?? [];

  if (isLoading) return <PageSkeleton />;

  const renderCategoryList = (cats: Category[]) => {
    if (cats.length === 0) {
      return (
        <EmptyState
          icon={Tags}
          title="No hay categorías"
          description="Creá una categoría para organizar tus movimientos."
          className="py-10"
        />
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cats.map((cat) => (
          <motion.div
            key={cat.id}
            layout
            whileHover={{ y: -1 }}
            className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card group"
          >
            <CategoryIcon icon={cat.icon} color={cat.color} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{cat.name}</p>
              {cat.isDefault && (
                <Badge variant="secondary" className="text-[10px] mt-1">
                  Por defecto
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => handleEdit(cat)}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              {!cat.isDefault && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                  onClick={() => setDeleteId(cat.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-6 lg:p-8 space-y-6"
    >
      <PageHeader title="Categorías" description="Organizá tus movimientos en categorías">
        <Button onClick={handleNew} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" />
          Nueva categoría
        </Button>
      </PageHeader>

      <motion.div variants={fadeInUp}>
        <Tabs defaultValue="expense" className="w-full">
          <TabsList className="rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="expense" className="rounded-lg">
              Gastos ({expenseCategories.length})
            </TabsTrigger>
            <TabsTrigger value="income" className="rounded-lg">
              Ingresos ({incomeCategories.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="expense" className="mt-4">
            {renderCategoryList(expenseCategories)}
          </TabsContent>
          <TabsContent value="income" className="mt-4">
            {renderCategoryList(incomeCategories)}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                placeholder="ej., Supermercado"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="flex rounded-xl bg-muted p-1 gap-1">
                {(["expense", "income"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={cn(
                      "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      selectedType === type
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {type === "income" ? "Ingreso" : "Gasto"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ícono</Label>
              <div className="flex flex-wrap gap-2">
                {iconOptions.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setSelectedIcon(icon)}
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all",
                      selectedIcon === icon
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:border-border"
                    )}
                  >
                    <CategoryIcon icon={icon} color={selectedColor} size="sm" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
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

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 rounded-xl">
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!name || isPending}
                className="flex-1 rounded-xl"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editingCategory ? "Guardar" : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Eliminar categoría"
        description="¿Estás seguro de que querés eliminar esta categoría? Los movimientos asociados quedarán sin categoría."
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
