import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

// Re-generates the PDF for an already-issued invoice (uses saved CAE — no ARCA call needed)
// eslint-disable-next-line @typescript-eslint/no-require-imports

function formatInvoiceNumber(ptoVenta: number, nro: number): string {
  return `${String(ptoVenta).padStart(4, "0")}-${String(nro).padStart(8, "0")}`;
}

function formatDateDisplay(yyyymmdd: string): string {
  return `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(0, 4)}`;
}

function dateToArcaFormat(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

async function generateQrDataUrl(params: {
  cuit: number; ptoVenta: number; tipoCmp: number; nroCmp: number;
  importe: number; tipoDocRec: number; nroDocRec: number; codAut: string; fecha: string;
}): Promise<string> {
  const data = {
    ver: 1,
    fecha: `${params.fecha.slice(0, 4)}-${params.fecha.slice(4, 6)}-${params.fecha.slice(6, 8)}`,
    cuit: params.cuit, ptoVta: params.ptoVenta, tipoCmp: params.tipoCmp,
    nroCmp: params.nroCmp, importe: params.importe, moneda: "PES", ctz: 1,
    tipoDocRec: params.tipoDocRec, nroDocRec: params.nroDocRec,
    tipoCodAut: "E", codAut: parseInt(params.codAut),
  };
  const encoded = Buffer.from(JSON.stringify(data)).toString("base64");
  return QRCode.toDataURL(`https://www.afip.gob.ar/fe/qr/?p=${encoded}`, { width: 120, margin: 1 });
}

export const IVA_CONDICIONES: Record<number, string> = {
  1: "IVA Responsable Inscripto",
  4: "IVA Sujeto Exento",
  5: "Consumidor Final",
  6: "Responsable Monotributo",
};

export const CONCEPTOS: Record<number, string> = {
  1: "Productos",
  2: "Servicios",
  3: "Productos y Servicios",
};

async function buildPdf(opts: {
  cuit: number;
  nombre: string;
  ptoVenta: number;
  nroFactura: number;
  fechaFactura: string;
  clienteNombre: string;
  clienteDoc: string;
  clienteDocTipo: number;
  condicionIva: number;
  concepto: string;
  conceptoTipo: number;
  fchServDesde?: string;
  fchServHasta?: string;
  fchVtoPago?: string;
  importe: number;
  cae: string;
  vencimientoCae: string;
  production: boolean;
}): Promise<Buffer> {
  const qrDataUrl = await generateQrDataUrl({
    cuit: opts.cuit,
    ptoVenta: opts.ptoVenta,
    tipoCmp: 11,
    nroCmp: opts.nroFactura,
    importe: opts.importe,
    tipoDocRec: opts.clienteDocTipo,
    nroDocRec: parseInt(opts.clienteDoc),
    codAut: opts.cae,
    fecha: opts.fechaFactura,
  });

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: "A4", margin: 30 }); // AFIP uses thin margins

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Dimensions
    const W = 595.28 - 60; // A4 width minus 30pt horizontal margins
    const startX = 30;
    
    // Outer bounding box
    const outerBoxTop = 30;
    const outerBoxBottom = 700; // Leaves room for footer
    doc.rect(startX, outerBoxTop, W, outerBoxBottom - outerBoxTop).lineWidth(1).strokeColor("black").stroke();

    // Horizontal line for header bottom
    const headerBottom = 150;
    doc.moveTo(startX, headerBottom).lineTo(startX + W, headerBottom).stroke();

    // Vertical line in header dividing emisor and invoice details
    doc.moveTo(startX + W / 2, outerBoxTop).lineTo(startX + W / 2, headerBottom).stroke();

    // The "C" Box in top center
    const boxSize = 40;
    const boxX = startX + W / 2 - boxSize / 2;
    const boxY = outerBoxTop;
    doc.rect(boxX, boxY, boxSize, boxSize).fillAndStroke("white", "black");
    doc.rect(boxX, boxY, boxSize, boxSize).stroke(); // ensure border is drawn
    doc.fontSize(24).font("Helvetica-Bold").fillColor("black").text("C", boxX, boxY + 5, { width: boxSize, align: "center" });
    doc.fontSize(7).font("Helvetica-Bold").text("COD. 011", boxX, boxY + 30, { width: boxSize, align: "center" });

    // LEFT HEADER
    doc.fontSize(12).font("Helvetica-Bold").text(opts.nombre.toUpperCase(), startX + 10, outerBoxTop + 20, { width: W / 2 - 40, align: "center" });
    
    // Emisor details
    const leftDetailX = startX + 5;
    let leftDetailY = outerBoxTop + 65;
    doc.fontSize(7).font("Helvetica-Bold").text("Razón Social: ", leftDetailX, leftDetailY, { continued: true })
       .font("Helvetica").text(opts.nombre.toUpperCase());
    leftDetailY += 15;
    doc.font("Helvetica-Bold").text("Domicilio Comercial: ", leftDetailX, leftDetailY, { continued: true })
       .font("Helvetica").text("187 1152 Piso:1 Dpto:B - Bernal, Buenos Aires", { width: W / 2 - 30 }); // Actual value from screenshot
    leftDetailY += 25;
    doc.font("Helvetica-Bold").text("Condición frente al IVA: ", leftDetailX, leftDetailY, { continued: true })
       .font("Helvetica").text("Responsable Monotributo");

    // RIGHT HEADER
    const rightDetailX = startX + W / 2 + 30;
    doc.fontSize(18).font("Helvetica-Bold").text("FACTURA", rightDetailX, outerBoxTop + 15);
    
    doc.fontSize(8).font("Helvetica-Bold").text(`Punto de Venta: `, rightDetailX, outerBoxTop + 45, { continued: true })
       .font("Helvetica").text(String(opts.ptoVenta).padStart(5, "0"), { continued: true })
       .font("Helvetica-Bold").text(`  Comp. Nro: `, { continued: true })
       .font("Helvetica").text(String(opts.nroFactura).padStart(8, "0"));
    doc.font("Helvetica-Bold").text("Fecha de Emisión: ", rightDetailX, outerBoxTop + 60, { continued: true })
       .font("Helvetica").text(formatDateDisplay(opts.fechaFactura));
    
    doc.font("Helvetica-Bold").text("CUIT: ", rightDetailX, outerBoxTop + 85, { continued: true })
       .font("Helvetica").text(String(opts.cuit));
    doc.font("Helvetica-Bold").text("Ingresos Brutos: ", rightDetailX, outerBoxTop + 100, { continued: true })
       .font("Helvetica").text("23-32173872-9"); // Actual value from screenshot
    doc.font("Helvetica-Bold").text("Fecha de Inicio de Actividades: ", rightDetailX, outerBoxTop + 115, { continued: true })
       .font("Helvetica").text("01/10/2009"); // Actual value from screenshot

    // HOMOLOGATION WARNING OVERLAY
    if (!opts.production) {
      doc.fillColor("red").fontSize(10).font("Helvetica-Bold")
         .text("AMBIENTE DE PRUEBAS (HOMOLOGACIÓN)", startX, outerBoxTop + 5, { width: W, align: "center" });
      doc.fillColor("black"); // reset
    }

    // PERIOD FACTURADO
    let currentY = headerBottom;
    if ((opts.conceptoTipo === 2 || opts.conceptoTipo === 3) && opts.fchServDesde && opts.fchServHasta && opts.fchVtoPago) {
      doc.rect(startX, currentY, W, 20).lineWidth(1).strokeColor("black").stroke();
      doc.fillColor("black").fontSize(8).font("Helvetica-Bold").text("Período Facturado Desde: ", startX + 5, currentY + 6, { continued: true })
         .font("Helvetica").text(formatDateDisplay(opts.fchServDesde), { continued: true })
         .font("Helvetica-Bold").text("       Hasta: ", { continued: true })
         .font("Helvetica").text(formatDateDisplay(opts.fchServHasta), { continued: true })
         .font("Helvetica-Bold").text("       Fecha de Vto. para el pago: ", { continued: true })
         .font("Helvetica").text(formatDateDisplay(opts.fchVtoPago));
      currentY += 20;
    }

    // DATOS DEL RECEPTOR
    const receptorBottom = currentY + 45;
    doc.moveTo(startX, receptorBottom).lineTo(startX + W, receptorBottom).stroke();
    doc.fontSize(8).font("Helvetica-Bold").text(`${opts.clienteDocTipo === 80 ? "CUIT" : "CUIT"}: `, startX + 5, currentY + 5, { continued: true })
       .font("Helvetica").text(opts.clienteDoc, { continued: true })
       .font("Helvetica-Bold").text("              Apellido y Nombre / Razón Social: ", { continued: true })
       .font("Helvetica").text(opts.clienteNombre);
    
    doc.font("Helvetica-Bold").text("Condición frente al IVA: ", startX + 5, currentY + 20, { continued: true })
       .font("Helvetica").text(IVA_CONDICIONES[opts.condicionIva] || "Consumidor Final", { continued: true })
       .font("Helvetica-Bold").text("              Domicilio: ", { continued: true })
       .font("Helvetica").text("-");
       
    doc.font("Helvetica-Bold").text("Condición de venta: ", startX + 5, currentY + 35, { continued: true })
       .font("Helvetica").text("Otra");
       
    currentY = receptorBottom;

    // TABLE HEADER
    doc.rect(startX, currentY, W, 15).fillAndStroke("#e0e0e0", "black");
    doc.rect(startX, currentY, W, 15).stroke(); // ensure border
    
    doc.fillColor("black").fontSize(7).font("Helvetica-Bold");
    // Columns (X coords relative to startX)
    const colCodigo = startX + 5; 
    const colProducto = startX + 45; 
    const colCantidad = startX + 235; 
    const colMedida = startX + 275; 
    const colPrecio = startX + 325; 
    const colBonif = startX + 380; 
    const colImpBonif = startX + 420; 
    const colSubtotal = startX + 475; 

    doc.text("Código", colCodigo, currentY + 4);
    doc.text("Producto / Servicio", colProducto, currentY + 4);
    doc.text("Cantidad", colCantidad, currentY + 4);
    doc.text("U. Medida", colMedida, currentY + 4);
    doc.text("Precio Unit.", colPrecio, currentY + 4);
    doc.text("% Bonif", colBonif, currentY + 4);
    doc.text("Imp. Bonif.", colImpBonif, currentY + 4);
    doc.text("Subtotal", colSubtotal, currentY + 4);

    // Vertical lines for table header
    [colProducto - 5, colCantidad - 5, colMedida - 5, colPrecio - 5, colBonif - 5, colImpBonif - 5, colSubtotal - 5].forEach(x => {
      doc.moveTo(x, currentY).lineTo(x, currentY + 15).stroke();
    });

    currentY += 15;

    // TABLE BODY (Single item)
    doc.fontSize(7).font("Helvetica");
    const itemY = currentY + 10;
    const formatNumber = (num: number) => num.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    doc.text("", colCodigo, itemY); // Empty code
    doc.text(opts.concepto.toUpperCase(), colProducto, itemY, { width: 180 });
    doc.text("1,00", colCantidad, itemY, { width: 30, align: "right" });
    doc.text("unidades", colMedida, itemY);
    doc.text(formatNumber(opts.importe), colPrecio, itemY, { width: 45, align: "right" });
    doc.text("0,00", colBonif, itemY, { width: 30, align: "right" });
    doc.text("0,00", colImpBonif, itemY, { width: 40, align: "right" });
    doc.text(formatNumber(opts.importe), colSubtotal - 5, itemY, { width: 55, align: "right" });

    // Close the table box at outerBoxBottom - 60
    const tableBottom = outerBoxBottom - 60;
    doc.moveTo(startX, tableBottom).lineTo(startX + W, tableBottom).stroke();
    
    // TOTALS (inside the outer box at the bottom)
    doc.fontSize(9).font("Helvetica-Bold");
    doc.text("Subtotal: $", colImpBonif - 90, tableBottom + 10, { width: 150, align: "right" });
    doc.text(formatNumber(opts.importe), colSubtotal - 5, tableBottom + 10, { width: 55, align: "right" });

    doc.text("Importe Otros Tributos: $", colImpBonif - 90, tableBottom + 25, { width: 150, align: "right" });
    doc.text("0,00", colSubtotal - 5, tableBottom + 25, { width: 55, align: "right" });

    doc.text("Importe Total: $", colImpBonif - 90, tableBottom + 40, { width: 150, align: "right" });
    doc.text(formatNumber(opts.importe), colSubtotal - 5, tableBottom + 40, { width: 55, align: "right" });

    // FOOTER (Outside outer box)
    const footerY = outerBoxBottom + 10;
    
    // QR
    const qrBase64 = qrDataUrl.split(",")[1];
    const qrBuf = Buffer.from(qrBase64, "base64");
    doc.image(qrBuf, startX + 5, footerY + 5, { width: 80 });

    // ARCA Logo text
    const textStart = startX + 90;
    doc.fontSize(7).font("Helvetica-Bold").text("AGENCIA DE RECAUDACIÓN", textStart, footerY + 28);
    doc.fontSize(5).font("Helvetica").text("Y CONTROL ADUANERO", textStart, footerY + 34);
    doc.fontSize(8).font("Helvetica-Bold").text("Comprobante Autorizado", textStart, footerY + 45);
    doc.fontSize(5).font("Helvetica-Bold").text("Esta Agencia no se responsabiliza por los datos ingresados en el detalle de la operación", textStart, footerY + 54);

    // Page number
    doc.fontSize(9).font("Helvetica-Bold").text("Pág. 1/1", startX, footerY + 10, { width: W, align: "center" });

    // CAE Info right aligned safely
    const caeLabelX = startX + W - 200;
    const caeValueX = startX + W - 90;
    
    doc.fontSize(9).font("Helvetica-Bold").text("CAE N°: ", caeLabelX, footerY + 10, { width: 105, align: "right" });
    doc.font("Helvetica").text(opts.cae, caeValueX, footerY + 10, { width: 90, align: "left" });
    
    doc.font("Helvetica-Bold").text("Fecha de Vto. de CAE: ", caeLabelX, footerY + 25, { width: 105, align: "right" });
    doc.font("Helvetica").text(formatDateDisplay(opts.vencimientoCae), caeValueX, footerY + 25, { width: 90, align: "left" });

    doc.end();
  });
}

export async function POST(request: Request) {
  try {
    const factura = await request.json();
    const cuit = parseInt(process.env.ARCA_CUIT!);
    const nombre = process.env.ARCA_NOMBRE ?? "Emisor";
    const production = process.env.ARCA_PRODUCTION === "true";
    const fechaFactura = dateToArcaFormat(factura.fecha);

    const pdfBuffer = await buildPdf({
      cuit, nombre,
      ptoVenta: factura.ptoVenta,
      nroFactura: factura.nroFactura,
      fechaFactura,
      clienteNombre: factura.clienteNombre,
      clienteDoc: factura.clienteDoc,
      clienteDocTipo: factura.clienteDocTipo,
      condicionIva: factura.condicionIva ?? 5,
      concepto: factura.concepto,
      conceptoTipo: factura.conceptoTipo ?? 2,
      fchServDesde: factura.fchServDesde ? dateToArcaFormat(factura.fchServDesde) : undefined,
      fchServHasta: factura.fchServHasta ? dateToArcaFormat(factura.fchServHasta) : undefined,
      fchVtoPago: factura.fchVtoPago ? dateToArcaFormat(factura.fchVtoPago) : undefined,
      importe: factura.importe,
      cae: factura.cae,
      vencimientoCae: factura.vencimientoCae,
      production,
    });

    return NextResponse.json({ pdf: pdfBuffer.toString("base64") });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
