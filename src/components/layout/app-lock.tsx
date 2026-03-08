"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { verifyLocalBiometrics } from "@/lib/biometrics";
import { Fingerprint, Lock, ShieldCheck, AlertTriangle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

type LockError = "no_credential" | "generic" | null;

export function AppLock({ children }: { children: React.ReactNode }) {
  const { user, settings, loading } = useAuth();
  const router = useRouter();
  
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lockError, setLockError] = useState<LockError>(null);

  const biometricEnabled = (settings as any)?.biometricEnabled === true;
  const credentialId = (settings as any)?.biometricCredentialId as string | undefined;

  const handleUnlock = async () => {
    if (!credentialId) return;
    setIsVerifying(true);
    setLockError(null);
    try {
      const success = await verifyLocalBiometrics(credentialId);
      if (success) {
        setIsUnlocked(true);
      }
    } catch (e: any) {
      console.error("Fallo al verificar biometría", e);
      // NotAllowedError suele significar que no hay ninguna llave registrada en este dispositivo/dominio
      const isNoCredential =
        e?.name === "NotAllowedError" ||
        e?.name === "InvalidStateError" ||
        (typeof e?.message === "string" && e.message.toLowerCase().includes("no credentials"));
      setLockError(isNoCredential ? "no_credential" : "generic");
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (!loading && user && biometricEnabled && !isUnlocked && credentialId) {
      const timer = setTimeout(() => {
        handleUnlock();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, user, biometricEnabled, isUnlocked, credentialId]);

  if (loading) return null;
  if (!user || !biometricEnabled) return <>{children}</>;

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
              <div className="absolute -top-24 -left-20 w-48 h-48 bg-violet-500/30 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute -bottom-24 -right-20 w-48 h-48 bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none" />

              {/* Error: no hay llave registrada en este dispositivo/dominio */}
              <AnimatePresence mode="wait">
                {lockError === "no_credential" ? (
                  <motion.div
                    key="no-cred-error"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center w-full"
                  >
                    <div className="relative p-4 rounded-full bg-amber-500/10 mb-6">
                      <AlertTriangle className="w-10 h-10 text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-center tracking-tight">No hay huella registrada aquí</h2>
                    <p className="text-sm text-muted-foreground text-center mb-8 leading-relaxed">
                      No hay ninguna llave biométrica registrada para este dispositivo.
                      <br />
                      Registrá tu huella o rostro en Ajustes para poder usarlo acá.
                    </p>
                    <Button
                      onClick={() => {
                        setIsUnlocked(true);
                        setTimeout(() => router.push("/settings"), 100);
                      }}
                      className="w-full h-14 rounded-2xl text-base font-semibold gap-3 shadow-lg shadow-amber-500/20 bg-amber-500 hover:bg-amber-400 text-black"
                    >
                      <Settings className="w-5 h-5" />
                      Ir a Ajustes y Registrar
                    </Button>
                    <button
                      onClick={() => setLockError(null)}
                      className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                    >
                      Intentar de nuevo
                    </button>
                  </motion.div>
                ) : lockError === "generic" ? (
                  <motion.div
                    key="generic-error"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center w-full"
                  >
                    <div className="relative p-4 rounded-full bg-emerald-500/10 mb-6">
                      <ShieldCheck className="w-10 h-10 text-emerald-500" />
                      <div className="absolute top-0 right-0 p-1 bg-background rounded-full translate-x-1/4 -translate-y-1/4 shadow-sm border border-border">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-center tracking-tight">App Bloqueada</h2>
                    <p className="text-sm text-muted-foreground text-center mb-8 leading-relaxed">
                      No se pudo verificar. Intentá de nuevo.
                    </p>
                    <Button
                      onClick={handleUnlock}
                      disabled={isVerifying}
                      className="w-full h-14 rounded-2xl text-base font-semibold gap-3 shadow-lg shadow-primary/20"
                    >
                      <Fingerprint className="w-5 h-5" />
                      Reintentar
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="default"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center w-full"
                  >
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
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
