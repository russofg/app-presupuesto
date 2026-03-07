"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/hooks/use-auth";
import { createUserSettings, initializeDefaultCategories } from "@/lib/services/firestore";
import { currencies, type Currency, currencySymbols } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { fireConfetti } from "@/lib/confetti";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  User,
  Coins,
  Target,
  Sparkles,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, title: "Sobre vos", icon: User },
  { id: 2, title: "Tu moneda", icon: Coins },
  { id: 3, title: "Presupuesto mensual", icon: Target },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refreshSettings } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [nameError, setNameError] = useState("");

  const handleNext = () => {
    if (step === 1) {
      if (!displayName.trim()) {
        setNameError("El nombre es obligatorio");
        return;
      }
      setNameError("");
    }
    if (step < 3) setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data: Record<string, unknown> = {
        displayName: displayName.trim(),
        currency,
        onboardingCompleted: true,
        theme: "system",
      };

      const budgetNum = parseFloat(monthlyBudget);
      if (monthlyBudget && !isNaN(budgetNum) && budgetNum > 0) {
        data.monthlyBudget = budgetNum;
      }

      await createUserSettings(user.uid, data);
      await initializeDefaultCategories(user.uid);
      await refreshSettings();
      toast.success("¡Listo! Bienvenido a Financia.");
      fireConfetti();
      setTimeout(() => router.push("/dashboard"), 800);
    } catch {
      toast.error("Algo salió mal. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">Financia</span>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-10">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                    step > s.id
                      ? "bg-primary text-primary-foreground"
                      : step === s.id
                      ? "bg-primary/15 text-primary border-2 border-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                </div>
                {i < steps.length - 1 && (
                  <div className="flex-1 h-0.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: step > s.id ? "100%" : "0%" }}
                      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">¿Cómo te llamás?</h2>
                  <p className="text-muted-foreground mt-2">
                    Esto nos ayuda a personalizar tu experiencia.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Tu nombre</Label>
                  <Input
                    id="displayName"
                    placeholder="ej., Fernando"
                    className="h-12 rounded-xl text-base"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setNameError("");
                    }}
                  />
                  {nameError && <p className="text-xs text-destructive">{nameError}</p>}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Elegí tu moneda</h2>
                  <p className="text-muted-foreground mt-2">
                    La vamos a usar para mostrar todos tus datos financieros.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {currencies.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCurrency(c)}
                      className={cn(
                        "flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 text-left",
                        currency === c
                          ? "border-primary bg-primary/5"
                          : "border-border/50 hover:border-border"
                      )}
                    >
                      <span className="text-lg font-bold tabular-nums">{currencySymbols[c]}</span>
                      <span className="text-sm font-medium">{c}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Establecé un presupuesto mensual</h2>
                  <p className="text-muted-foreground mt-2">
                    Opcional. Siempre lo podés cambiar después en ajustes.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyBudget">Límite de gasto mensual</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      {currencySymbols[currency]}
                    </span>
                    <Input
                      id="monthlyBudget"
                      type="number"
                      placeholder="0.00"
                      className="h-12 rounded-xl text-base pl-10 tabular-nums"
                      value={monthlyBudget}
                      onChange={(e) => setMonthlyBudget(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Dejalo vacío si lo querés configurar después.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-3 mt-8">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            )}
            <div className="flex-1" />
            {step === 3 && !monthlyBudget && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleSubmit}
                disabled={loading}
                className="rounded-xl text-muted-foreground"
              >
                Omitir
              </Button>
            )}
            {step < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="rounded-xl min-w-[120px] group"
              >
                Continuar
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="rounded-xl min-w-[140px] group"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Empezar
                    <Sparkles className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
