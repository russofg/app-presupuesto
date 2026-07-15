"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, FileText, Loader2, Download, Share2,
  CheckCircle2, AlertCircle, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { createFactura } from "@/lib/services/firestore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FacturaModalProps {
  open: boolean;
  onClose: () => void;
  defaultImporte?: number;
  defaultConcepto?: string;
  transactionId?: string;
}

interface FacturaResult {
  pdf: string;
  cae: string;
  nroFactura: number;
  ptoVenta: number;
  vencimientoCae: string;
}

const DOC_TIPOS = [
  { value: 96, label: "DNI" },
  { value: 80, label: "CUIT" },
];

const CONDICIONES_IVA = [
  { value: 5, label: "Consumidor Final" },
  { value: 1, label: "IVA Responsable Inscripto" },
  { value: 6, label: "Responsable Monotributo" },
  { value: 4, label: "IVA Sujeto Exento" },
];

const CONCEPTOS = [
  { value: 1, label: "Productos" },
  { value: 2, label: "Servicios" },
  { value: 3, label: "Productos y Servicios" },
];


function formatNroFactura(pto: number, nro: number) {
  return `${String(pto).padStart(4, "0")}-${String(nro).padStart(8, "0")}`;
}

function formatDateDisplay(yyyymmdd: string) {
  return `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(0, 4)}`;
}

function downloadPdf(base64: string, filename: string) {
  const blob = new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function sharePdf(base64: string, filename: string) {
  if (!navigator.share) {
    downloadPdf(base64, filename);
    return;
  }
  const blob = new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], {
    type: "application/pdf",
  });
  const file = new File([blob], filename, { type: "application/pdf" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: filename });
  } else {
    downloadPdf(base64, filename);
  }
}

export function FacturaModal({
  open,
  onClose,
  defaultImporte,
  defaultConcepto,
  transactionId,
}: FacturaModalProps) {
  const { user } = useAuth();

  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteDoc, setClienteDoc] = useState("");
  const [clienteDocTipo, setClienteDocTipo] = useState(96);
  const [condicionIva, setCondicionIva] = useState(5);
  const [concepto, setConcepto] = useState(defaultConcepto ?? "");
  const [conceptoTipo, setConceptoTipo] = useState(2);
  const [importe, setImporte] = useState(defaultImporte ? String(defaultImporte) : "");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [fchServDesde, setFchServDesde] = useState(new Date().toISOString().slice(0, 10));
  const [fchServHasta, setFchServHasta] = useState(new Date().toISOString().slice(0, 10));
  const [fchVtoPago, setFchVtoPago] = useState(new Date().toISOString().slice(0, 10));
  const [proximoNumero, setProximoNumero] = useState<number | null>(null);
  const [ptoVenta, setPtoVenta] = useState<number>(4);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FacturaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTest, setIsTest] = useState(true);

  // Load next invoice number on open
  useEffect(() => {
    if (!open) { setResult(null); setError(null); return; }
    setConcepto(defaultConcepto ?? "");
    setImporte(defaultImporte ? String(defaultImporte) : "");
    fetch("/api/arca/ultimo-numero")
      .then((r) => r.json())
      .then((d) => {
        setProximoNumero(d.proximoNumero ?? null);
        if (d.ptoVenta) setPtoVenta(d.ptoVenta);
        setIsTest(!d.production);
      })
      .catch(() => {});
  }, [open, defaultImporte, defaultConcepto]);

  const handleSubmit = async () => {
    if (!clienteNombre || !clienteDoc || !concepto || !importe) {
      setError("Completá todos los campos obligatorios.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/arca/factura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteNombre,
          clienteDoc,
          clienteDocTipo,
          condicionIva,
          concepto,
          conceptoTipo,
          importe: parseFloat(importe),
          fecha,
          fchServDesde,
          fchServHasta,
          fchVtoPago,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al generar factura");

      setResult(data);

      // Save metadata to Firestore
      if (user?.uid) {
        await createFactura(user.uid, {
          nroFactura: data.nroFactura,
          ptoVenta: data.ptoVenta,
          fecha: new Date(fecha),
          clienteNombre,
          clienteDoc,
          clienteDocTipo,
          condicionIva,
          concepto,
          conceptoTipo,
          fchServDesde: conceptoTipo > 1 ? fchServDesde : undefined,
          fchServHasta: conceptoTipo > 1 ? fchServHasta : undefined,
          fchVtoPago: conceptoTipo > 1 ? fchVtoPago : undefined,
          importe: parseFloat(importe),
          cae: data.cae,
          vencimientoCae: data.vencimientoCae,
          ...(transactionId ? { transactionId } : {}),
        });
      }
      toast.success(`Factura C N° ${formatNroFactura(data.ptoVenta, data.nroFactura)} emitida`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#009ee3]/40 transition-all placeholder:text-muted-foreground";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg bg-background rounded-2xl border border-border shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <FileText className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h2 className="font-bold text-sm">Emitir Factura C</h2>
                  {isTest && (
                    <span className="text-xs text-amber-500 font-medium">🧪 Modo prueba (Homologación)</span>
                  )}
                  {proximoNumero !== null && (
                    <p className="text-xs text-muted-foreground">
                      Próximo N°: <span className="font-mono font-semibold">{formatNroFactura(ptoVenta, proximoNumero)}</span>
                    </p>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {result ? (
                /* ── Success state ── */
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="p-3 rounded-full bg-emerald-500/10">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold">¡Factura emitida!</p>
                      <p className="text-sm text-muted-foreground">
                        N° {formatNroFactura(result.ptoVenta, result.nroFactura)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        CAE: <span className="font-mono">{result.cae}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Vence: {formatDateDisplay(result.vencimientoCae)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => downloadPdf(result.pdf, `factura-${formatNroFactura(result.ptoVenta, result.nroFactura)}.pdf`)}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Descargar PDF
                    </button>
                    <button
                      onClick={() => sharePdf(result.pdf, `factura-${formatNroFactura(result.ptoVenta, result.nroFactura)}.pdf`)}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors text-sm font-medium"
                    >
                      <Share2 className="w-4 h-4" />
                      Compartir
                    </button>
                  </div>

                  <Button
                    onClick={() => { setResult(null); setClienteNombre(""); setClienteDoc(""); }}
                    variant="outline"
                    className="w-full"
                  >
                    Emitir otra factura
                  </Button>
                </div>
              ) : (
                /* ── Form ── */
                <div className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  {/* Client */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Datos del receptor</p>
                    <input
                      className={inputClass}
                      placeholder="Nombre completo / Razón social *"
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <div className="relative">
                        <select
                          value={clienteDocTipo}
                          onChange={(e) => setClienteDocTipo(Number(e.target.value))}
                          className="appearance-none h-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#009ee3]/40"
                        >
                          {DOC_TIPOS.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-3 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                      </div>
                      <input
                        className={cn(inputClass, "flex-1")}
                        placeholder="Número de documento *"
                        value={clienteDoc}
                        onChange={(e) => setClienteDoc(e.target.value.replace(/\D/g, ""))}
                      />
                    </div>
                    <div className="relative">
                      <select
                        value={condicionIva}
                        onChange={(e) => setCondicionIva(Number(e.target.value))}
                        className="appearance-none w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#009ee3]/40"
                      >
                        {CONDICIONES_IVA.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-3 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  {/* Invoice data */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detalle del comprobante</p>
                    <div className="relative">
                      <select
                        value={conceptoTipo}
                        onChange={(e) => setConceptoTipo(Number(e.target.value))}
                        className="appearance-none w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#009ee3]/40"
                      >
                        {CONCEPTOS.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-3 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                    <input
                      className={inputClass}
                      placeholder="Concepto / Descripción del ítem *"
                      value={concepto}
                      onChange={(e) => setConcepto(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        className={cn(inputClass, "flex-1")}
                        placeholder="Importe total *"
                        value={importe}
                        onChange={(e) => setImporte(e.target.value)}
                        min="0"
                        step="0.01"
                      />
                      <div className="flex-1 relative">
                        <label className="text-[10px] absolute -top-2 left-2 px-1 bg-background text-muted-foreground font-medium">Fecha Factura</label>
                        <input
                          type="date"
                          className={cn(inputClass, "w-full")}
                          value={fecha}
                          onChange={(e) => setFecha(e.target.value)}
                        />
                      </div>
                    </div>

                    {(conceptoTipo === 2 || conceptoTipo === 3) && (
                      <div className="space-y-3 pt-2 border-t border-border mt-3">
                        <p className="text-[11px] font-medium text-muted-foreground">Período facturado (obligatorio para servicios)</p>
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <label className="text-[10px] absolute -top-2 left-2 px-1 bg-background text-muted-foreground font-medium">Desde</label>
                            <input
                              type="date"
                              className={cn(inputClass, "text-xs w-full")}
                              value={fchServDesde}
                              onChange={(e) => setFchServDesde(e.target.value)}
                            />
                          </div>
                          <div className="flex-1 relative">
                            <label className="text-[10px] absolute -top-2 left-2 px-1 bg-background text-muted-foreground font-medium">Hasta</label>
                            <input
                              type="date"
                              className={cn(inputClass, "text-xs w-full")}
                              value={fchServHasta}
                              onChange={(e) => setFchServHasta(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="relative">
                          <label className="text-[10px] absolute -top-2 left-2 px-1 bg-background text-muted-foreground font-medium">Vencimiento para el pago</label>
                          <input
                            type="date"
                            className={cn(inputClass, "text-xs w-full")}
                            value={fchVtoPago}
                            onChange={(e) => setFchVtoPago(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generando factura...</>
                    ) : (
                      <><FileText className="w-4 h-4 mr-2" />Emitir Factura C</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
