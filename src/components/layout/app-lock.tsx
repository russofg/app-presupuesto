"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/hooks/use-auth";
import { verifyLocalBiometrics } from "@/lib/biometrics";
import { Fingerprint, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppLock({ children }: { children: React.ReactNode }) {
  const { user, settings, loading } = useAuth();
  
  // Si no está cargando y el usuario tiene biometría activada, asumimos que está bloqueado inicialmente
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const biometricEnabled = (settings as any)?.biometricEnabled === true;
  const credentialId = (settings as any)?.biometricCredentialId as string | undefined;

  const handleUnlock = async () => {
    if (!credentialId) return;
    setIsVerifying(true);
    try {
      const success = await verifyLocalBiometrics(credentialId);
      if (success) {
        setIsUnlocked(true);
      }
    } catch (e) {
      console.error("Fallo al verificar biometría", e);
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    // Si la biometría está habilitada, lanzamos el prompt automáticamente la primera vez
    if (!loading && user && biometricEnabled && !isUnlocked && credentialId) {
      // Pequeño timeout para no bloquear el renderizado inicial del overlay
      const timer = setTimeout(() => {
        handleUnlock();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, user, biometricEnabled, isUnlocked, credentialId]);

  // Si está cargando auth, no mostramos nada para evitar destellos
  if (loading) return null;

  // Si no hay usuario o no tiene biometría, mostramos la app directo
  if (!user || !biometricEnabled) {
    return <>{children}</>;
  }

  return (
    <>
      <div className={isUnlocked ? "" : "pointer-events-none blur-sm select-none opacity-50 transition-all duration-500"}>
        {children}
      </div>

      <AnimatePresence>
        {!isUnlocked && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80"
          >
            <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none" />
            
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="relative z-10 flex flex-col items-center max-w-sm w-full p-8 rounded-3xl border border-white/10 dark:border-white/5 bg-gradient-to-b from-background/90 to-background shadow-2xl overflow-hidden"
            >
              {/* Decorative Glow */}
              <div className="absolute -top-24 -left-20 w-48 h-48 bg-violet-500/30 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute -bottom-24 -right-20 w-48 h-48 bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none" />

              <div className="relative p-4 rounded-full bg-emerald-500/10 mb-6">
                <ShieldCheck className="w-10 h-10 text-emerald-500" />
                <div className="absolute top-0 right-0 p-1 bg-background rounded-full translate-x-1/4 -translate-y-1/4 shadow-sm border border-border">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              <h2 className="text-2xl font-bold mb-2 text-center tracking-tight">App Bloqueada</h2>
              <p className="text-sm text-muted-foreground text-center mb-8 leading-relaxed">
                Financia está protegida con seguridad biométrica. Usá tu huella o rostro para continuar.
              </p>

              <Button
                onClick={handleUnlock}
                disabled={isVerifying}
                className="w-full h-14 rounded-2xl text-base font-semibold gap-3 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              >
                {isVerifying ? (
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/80 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/80 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/80 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                ) : (
                  <>
                    <Fingerprint className="w-5 h-5" />
                    Desbloquear Financia
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
