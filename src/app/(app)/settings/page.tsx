"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/use-auth";
import { useRecurring, useDeleteRecurring } from "@/hooks/use-recurring";
import { useCategories } from "@/hooks/use-categories";
import { useTransactions } from "@/hooks/use-transactions";
import { useBudgets } from "@/hooks/use-budgets";
import { useGoals } from "@/hooks/use-goals";
import { updateUserSettings } from "@/lib/services/firestore";
import { logOut, changePassword, deleteAccount } from "@/lib/services/auth";
import { calculateTotalXP, calculateAchievements } from "@/lib/gamification";
import { filterRealTransactions } from "@/lib/transactions-utils";
import { PageHeader } from "@/components/layout/page-header";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  User,
  Palette,
  Shield,
  LogOut,
  Loader2,
  Monitor,
  Moon,
  Sun,
  Sparkles,
  Repeat,
  Trash2,
  Lock,
  AlertTriangle,
  Download,
  Database,
  Volume2,
  VolumeX,
} from "lucide-react";
import { currencies, currencySymbols, type Currency, type RecurringFrequency } from "@/types";
import { cn } from "@/lib/utils";
import { useGlobalSoundMute } from "@/hooks/use-ui-sounds";

const frequencyLabels: Record<RecurringFrequency, string> = {
  daily: "Diario",
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  yearly: "Anual",
};

export default function SettingsPage() {
  const { user, settings, refreshSettings } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { muted, setMuted } = useGlobalSoundMute();

  const { data: recurring } = useRecurring();
  const { data: categories } = useCategories();
  const deleteRecurring = useDeleteRecurring();
  const { data: allTransactions } = useTransactions({});
  const now = new Date();
  const { data: budgets } = useBudgets(now.getMonth() + 1, now.getFullYear());
  const { data: goals } = useGoals();
  const [exporting, setExporting] = useState(false);

  const [displayName, setDisplayName] = useState(settings?.displayName || "");
  const [currency, setCurrency] = useState<Currency>(settings?.currency || "ARS");
  const [saving, setSaving] = useState(false);

  const [passwordDialog, setPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserSettings(user.uid, { displayName, currency });
      await refreshSettings();
      toast.success("Ajustes guardados");
    } catch {
      toast.error("Error al guardar ajustes");
    } finally {
      setSaving(false);
    }
  };

  const handleSyncGamification = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const txs = allTransactions ?? [];
      const realTxs = filterRealTransactions(txs);
      const bgs = budgets ?? [];
      const gls = goals ?? [];
      
      const budgetsWithSpent = bgs.map((b) => ({
        categoryId: b.categoryId,
        amount: b.amount,
        spent: realTxs.filter((t) => t.type === "expense" && t.categoryId === b.categoryId).reduce((s, t) => s + t.amount, 0),
      }));
      
      const income = realTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expenses = realTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      
      const currentStreak = (settings as Record<string, unknown>)?.streakCount as number ?? 0;
      const longestStreak = (settings as Record<string, unknown>)?.longestStreak as number ?? 0;

      const totalXP = calculateTotalXP({ transactions: txs, budgets: bgs, goals: gls, streakDays: currentStreak });
      const achievements = calculateAchievements({
        transactions: txs,
        budgets: budgetsWithSpent,
        goals: gls,
        streakDays: currentStreak,
        longestStreak,
        income,
        expenses,
        totalXP,
      });

      const unlockedAchievements = achievements.filter(a => a.unlocked).map(a => a.id);

      await updateUserSettings(user.uid, { totalXP, unlockedAchievements });
      await refreshSettings();
      toast.success(`Nivel y XP restaurados con éxito (${totalXP} XP)`);
    } catch (e: unknown) {
      console.error(e);
      toast.error("Error al sincronizar datos");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    if (newPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast.error("La contraseña debe tener mayúscula, minúscula y número");
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Contraseña actualizada");
      setPasswordDialog(false);
      setCurrentPassword("");
      setNewPassword("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("wrong-password") || msg.includes("invalid-credential")) {
        toast.error("La contraseña actual es incorrecta");
      } else if (msg.includes("requires-recent-login")) {
        toast.error("Tu sesión expiró. Cerrá sesión e ingresá de nuevo para cambiar la contraseña.");
      } else if (msg.includes("weak-password")) {
        toast.error("La contraseña nueva es muy débil. Usá al menos 8 caracteres.");
      } else {
        toast.error("No se pudo cambiar la contraseña. Intentá de nuevo.");
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "ELIMINAR") return;
    setDeleting(true);
    try {
      await deleteAccount();
      router.push("/login");
      toast.success("Cuenta eliminada correctamente");
    } catch {
      toast.error("Error al eliminar cuenta. Intentá cerrar sesión y volver a entrar.");
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
      router.push("/login");
    } catch {
      toast.error("Error al cerrar sesión");
    }
  };

  const handleExportJSON = () => {
    setExporting(true);
    try {
      const data = {
        exportDate: new Date().toISOString(),
        transactions: allTransactions ?? [],
        categories: categories ?? [],
        budgets: budgets ?? [],
        goals: goals ?? [],
        recurring: recurring ?? [],
        settings: settings ? { displayName: settings.displayName, currency: settings.currency } : null,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `financia-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup descargado correctamente");
    } catch {
      toast.error("Error al exportar datos");
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = () => {
    setExporting(true);
    try {
      const txs = allTransactions ?? [];
      if (txs.length === 0) {
        toast.error("No hay movimientos para exportar");
        setExporting(false);
        return;
      }
      const catMap = new Map((categories ?? []).map((c) => [c.id, c.name]));
      const header = "Fecha,Tipo,Categoría,Descripción,Monto,Notas\n";
      const rows = txs.map((t) => {
        const date = new Date(t.date).toLocaleDateString("es-AR");
        const type = t.type === "income" ? "Ingreso" : "Gasto";
        const cat = catMap.get(t.categoryId) ?? "";
        const desc = `"${(t.description || "").replace(/"/g, '""')}"`;
        const notes = `"${(t.notes || "").replace(/"/g, '""')}"`;
        return `${date},${type},${cat},${desc},${t.amount},${notes}`;
      }).join("\n");
      const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `financia-movimientos-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV descargado correctamente");
    } catch {
      toast.error("Error al exportar CSV");
    } finally {
      setExporting(false);
    }
  };

  const themes = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Oscuro", icon: Moon },
    { value: "system", label: "Sistema", icon: Monitor },
  ];

  const isPasswordUser = user?.providerData.some((p) => p.providerId === "password") ?? false;

  const getCat = (id: string) => categories?.find((c) => c.id === id);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-2xl"
    >
      <PageHeader title="Ajustes" description="Gestioná tu cuenta y preferencias" />

      {/* Profile */}
      <motion.div variants={fadeInUp} className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <User className="w-4 h-4" />
          Perfil
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Nombre</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Correo electrónico</Label>
            <Input
              value={user?.email || ""}
              disabled
              className="h-11 rounded-xl opacity-60"
            />
          </div>
          <div className="space-y-2">
            <Label>Moneda</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c} value={c}>
                    {currencySymbols[c]} {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Guardar cambios
          </Button>
        </div>
      </motion.div>

      {/* Recurring Transactions */}
      <motion.div variants={fadeInUp} className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Repeat className="w-4 h-4" />
          Movimientos recurrentes
        </div>
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          {!recurring || recurring.length === 0 ? (
            <div className="p-5 text-center">
              <Repeat className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No tenés movimientos recurrentes.</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Podés crear uno al agregar un movimiento nuevo.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {recurring.map((rule) => {
                const cat = getCat(rule.categoryId);
                return (
                  <div
                    key={rule.id}
                    className="flex items-center gap-3 p-4 group hover:bg-muted/30 transition-colors"
                  >
                    <CategoryIcon
                      icon={cat?.icon || "Circle"}
                      color={cat?.color || "#94a3b8"}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{rule.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {frequencyLabels[rule.frequency as RecurringFrequency] || rule.frequency}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {cat?.name || "Sin categoría"}
                        </span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-semibold tabular-nums whitespace-nowrap",
                        rule.type === "income" ? "text-success" : ""
                      )}
                    >
                      {rule.type === "income" ? "+" : "-"}
                      {currencySymbols[currency]}{rule.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={() => deleteRecurring.mutate(rule.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Appearance */}
      <motion.div variants={fadeInUp} className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Palette className="w-4 h-4" />
          Apariencia
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <Label className="mb-3 block">Tema</Label>
          <div className="grid grid-cols-3 gap-3">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  theme === t.value
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:border-border"
                )}
              >
                <t.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="border-t border-border/50 my-5" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Efectos de sonido y vibración</p>
              <p className="text-xs text-muted-foreground">
                Reproducir sonidos y vibraciones al interactuar.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {muted ? (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Volume2 className="w-4 h-4 text-primary" />
              )}
              <Switch checked={!muted} onCheckedChange={(checked) => setMuted(!checked)} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Data & Export */}
      <motion.div variants={fadeInUp} className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Database className="w-4 h-4" />
          Tus datos
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Exportar backup completo</p>
              <p className="text-xs text-muted-foreground">
                Descargá todos tus datos en formato JSON.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleExportJSON}
              disabled={exporting}
              className="rounded-xl gap-2"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              JSON
            </Button>
          </div>

          <div className="border-t border-border/50" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Exportar movimientos</p>
              <p className="text-xs text-muted-foreground">
                Descargá tus movimientos en CSV para Excel.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={exporting}
              className="rounded-xl gap-2"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              CSV
            </Button>
          </div>

          <div className="border-t border-border/50" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sincronizar Gamificación</p>
              <p className="text-xs text-muted-foreground">
                Recalcula tu XP y Logros en base al historial actual.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleSyncGamification}
              disabled={saving}
              className="rounded-xl gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-500" />}
              Restaurar XP
            </Button>
          </div>

          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              💡 Recomendamos hacer un backup periódico de tus datos. El archivo JSON incluye movimientos, categorías, presupuestos, metas y ajustes.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Security & Account */}
      <motion.div variants={fadeInUp} className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Shield className="w-4 h-4" />
          Seguridad y cuenta
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Bloqueo con Biometría (Passkey)</p>
              <p className="text-xs text-muted-foreground">Requerir huella o rostro al abrir la app.</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch 
                checked={!!(settings as any)?.biometricEnabled} 
                onCheckedChange={async (checked) => {
                  if (!user) return;
                  if (checked) {
                    try {
                      const { isBiometricsSupported, registerLocalBiometrics } = await import("@/lib/biometrics");
                      const supported = await isBiometricsSupported();
                      if (!supported) {
                        toast.error("Tu dispositivo o navegador no soporta biometría nativa.");
                        return;
                      }
                      const credId = await registerLocalBiometrics(user.email || "Usuario Financia");
                      if (credId) {
                        await updateUserSettings(user.uid, { biometricEnabled: true, biometricCredentialId: credId });
                        await refreshSettings();
                        toast.success("Biometría configurada correctamente.");
                      } else {
                        toast.error("Se canceló el registro biométrico.");
                      }
                    } catch (e) {
                      toast.error("Falló la configuración biométrica.");
                    }
                  } else {
                    await updateUserSettings(user.uid, { biometricEnabled: false, biometricCredentialId: null });
                    await refreshSettings();
                    toast.success("Bloqueo biométrico desactivado.");
                  }
                }} 
              />
            </div>
          </div>

          <div className="border-t border-border/50" />

          {isPasswordUser && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Cambiar contraseña</p>
                  <p className="text-xs text-muted-foreground">Actualizá tu contraseña de acceso.</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setPasswordDialog(true)}
                  className="rounded-xl gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Cambiar
                </Button>
              </div>

              <div className="border-t border-border/50" />
            </>
          )}

          {!isPasswordUser && (
            <>
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <div>
                  <p className="text-sm font-medium">Sesión con Google</p>
                  <p className="text-xs text-muted-foreground">Tu cuenta está vinculada a {user?.email}</p>
                </div>
              </div>

              <div className="border-t border-border/50" />
            </>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Cerrar sesión</p>
              <p className="text-xs text-muted-foreground">Salí de tu cuenta en este dispositivo.</p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="rounded-xl gap-2 text-destructive hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </Button>
          </div>

          <div className="border-t border-border/50" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-destructive">Eliminar cuenta</p>
              <p className="text-xs text-muted-foreground">Se borrarán todos tus datos permanentemente.</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog(true)}
              className="rounded-xl gap-2 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/50 hover:bg-destructive/5"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div variants={fadeInUp} className="text-center py-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Financia</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Versión 1.1.0 · Hecho con dedicación
        </p>
      </motion.div>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialog} onOpenChange={setPasswordDialog}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>
              Ingresá tu contraseña actual y la nueva.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Contraseña actual</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Nueva contraseña</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mín. 8 caracteres, mayúscula, minúscula y número"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setPasswordDialog(false)} className="flex-1 rounded-xl">
                Cancelar
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={!currentPassword || !newPassword || changingPassword}
                className="flex-1 rounded-xl"
              >
                {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cambiar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Eliminar cuenta
            </DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. Todos tus datos (movimientos, presupuestos, metas, categorías) se eliminarán permanentemente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Escribí ELIMINAR para confirmar</Label>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="ELIMINAR"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => { setDeleteDialog(false); setDeleteConfirm(""); }} className="flex-1 rounded-xl">
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== "ELIMINAR" || deleting}
                className="flex-1 rounded-xl"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Eliminar cuenta"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
