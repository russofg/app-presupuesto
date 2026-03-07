"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { resetPassword } from "@/lib/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const COOLDOWN_SECONDS = 60;

const resetSchema = z.object({
  email: z.email("Ingresá un email válido"),
});

type ResetForm = z.infer<typeof resetSchema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = useCallback(async (data: ResetForm) => {
    if (cooldown > 0) return;
    setLoading(true);
    try {
      await resetPassword(data.email);
      setSent(true);
      setCooldown(COOLDOWN_SECONDS);
      toast.success("¡Email de recuperación enviado!");
    } catch {
      toast.error("Algo salió mal. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [cooldown]);

  return (
    <>
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al inicio de sesión
      </Link>

      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-5">
              <Mail className="w-7 h-7 text-success" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">Revisá tu email</h2>
            <p className="text-muted-foreground">
              Te enviamos un enlace para recuperar tu contraseña. Revisá tu bandeja de entrada.
            </p>
            <div className="flex flex-col items-center gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => { if (cooldown <= 0) setSent(false); }}
                disabled={cooldown > 0}
                className="rounded-xl"
              >
                {cooldown > 0 ? `Reintentar en ${cooldown}s` : "Enviar de nuevo"}
              </Button>
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight">Recuperar contraseña</h2>
              <p className="text-muted-foreground mt-2">
                Ingresá tu email y te enviamos un enlace para recuperar tu contraseña
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  autoComplete="email"
                  className="h-11 rounded-xl"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl font-medium text-sm"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Enviar enlace"
                )}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
