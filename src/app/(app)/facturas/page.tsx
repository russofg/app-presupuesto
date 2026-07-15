"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { FileText, Plus, Loader2, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getFacturas, type Factura } from "@/lib/services/firestore";
import { FacturaModal } from "@/components/facturas/factura-modal";
import { cn } from "@/lib/utils";

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function formatNro(pto: number, nro: number) {
  return `${String(pto).padStart(4, "0")}-${String(nro).padStart(8, "0")}`;
}
function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}
function formatDateDisplay(yyyymmdd: string) {
  return `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(0, 4)}`;
}

function downloadPdf(base64: string, filename: string) {
  const blob = new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function sharePdf(base64: string, filename: string) {
  if (!navigator.share) { downloadPdf(base64, filename); return; }
  const blob = new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], { type: "application/pdf" });
  const file = new File([blob], filename, { type: "application/pdf" });
  if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: filename });
  else downloadPdf(base64, filename);
}

async function regeneratePdf(factura: Factura): Promise<string | null> {
  const res = await fetch("/api/arca/factura/regenerar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(factura),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.pdf ?? null;
}

export default function FacturasPage() {
  const { user } = useAuth();
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const loadFacturas = async () => {
    if (!user?.uid) return;
    setLoading(true);
    const list = await getFacturas(user.uid);
    setFacturas(list);
    setLoading(false);
  };

  useEffect(() => { loadFacturas(); }, [user?.uid]);

  const handleRegenerate = async (factura: Factura, action: "download" | "share") => {
    setRegenerating(factura.id);
    const pdf = await regeneratePdf(factura);
    setRegenerating(null);
    if (!pdf) return;
    const filename = `factura-${formatNro(factura.ptoVenta, factura.nroFactura)}.pdf`;
    if (action === "share") sharePdf(pdf, filename);
    else downloadPdf(pdf, filename);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <motion.div
        initial="hidden" animate="visible" variants={fadeInUp}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facturas</h1>
          <p className="text-sm text-muted-foreground">Facturación electrónica ARCA (Monotributo)</p>
        </div>
        <Button
          onClick={() => { setModalOpen(true); }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva factura
        </Button>
      </motion.div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : facturas.length === 0 ? (
        <motion.div
          initial="hidden" animate="visible" variants={fadeInUp}
          className="flex flex-col items-center justify-center py-20 gap-3 text-center"
        >
          <div className="p-4 rounded-2xl bg-muted/40 border border-border">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="font-medium">Todavía no emitiste facturas</p>
          <p className="text-sm text-muted-foreground">Hacé click en &quot;Nueva factura&quot; para empezar</p>
        </motion.div>
      ) : (
        <motion.div
          initial="hidden" animate="visible" variants={fadeInUp}
          className="space-y-3"
        >
          {facturas.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                <FileText className="w-5 h-5 text-emerald-500" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-bold">
                    {formatNro(f.ptoVenta, f.nroFactura)}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(f.fecha)}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{f.clienteNombre} — {f.concepto}</p>
                <p className="text-xs text-muted-foreground">
                  CAE: <span className="font-mono">{f.cae}</span> · Vence: {formatDateDisplay(f.vencimientoCae)}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="font-bold text-emerald-500">
                  {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(f.importe)}
                </p>
                <div className="flex items-center gap-1 mt-1 justify-end">
                  <button
                    onClick={() => handleRegenerate(f, "download")}
                    disabled={regenerating === f.id}
                    className={cn(
                      "p-1.5 rounded-lg hover:bg-muted transition-colors",
                      regenerating === f.id && "opacity-50"
                    )}
                    title="Descargar PDF"
                  >
                    {regenerating === f.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Download className="w-3.5 h-3.5" />
                    }
                  </button>
                  <button
                    onClick={() => handleRegenerate(f, "share")}
                    disabled={regenerating === f.id}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    title="Compartir"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      <FacturaModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); loadFacturas(); }}
      />
    </div>
  );
}
