/**
 * Direct ARCA WSFE (Facturación Electrónica v1) calls.
 * Uses raw SOAP XML with axios — no third-party proxy.
 */

import axios from "axios";

const WSFE_HOMO = "https://wswhomo.afip.gov.ar/wsfev1/service.asmx";
const WSFE_PROD = "https://servicios1.afip.gov.ar/wsfev1/service.asmx";

function wsfeUrl(production: boolean) {
  return production ? WSFE_PROD : WSFE_HOMO;
}

async function soapPost(
  url: string,
  action: string,
  body: string
): Promise<string> {
  const response = await axios.post(url, body, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `http://ar.gov.afip.dif.FEV1/${action}`,
    },
    timeout: 30_000,
  });
  return response.data as string;
}

function authXml(token: string, sign: string, cuit: number) {
  return `<ar:Auth><ar:Token>${token}</ar:Token><ar:Sign>${sign}</ar:Sign><ar:Cuit>${cuit}</ar:Cuit></ar:Auth>`;
}

/** FECompUltimoAutorizado — returns last issued voucher number */
export async function getLastVoucher(
  cuit: number,
  ptoVenta: number,
  cbteTipo: number,
  token: string,
  sign: string,
  production: boolean
): Promise<number> {
  const url = wsfeUrl(production);

  const soap = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope" xmlns:ar="http://ar.gov.afip.dif.FEV1/"><soap12:Body><ar:FECompUltimoAutorizado>${authXml(token, sign, cuit)}<ar:PtoVta>${ptoVenta}</ar:PtoVta><ar:CbteTipo>${cbteTipo}</ar:CbteTipo></ar:FECompUltimoAutorizado></soap12:Body></soap12:Envelope>`;

  const xml = await soapPost(url, "FECompUltimoAutorizado", soap);
  console.log("[WSFE] FECompUltimoAutorizado response snippet:", xml.slice(0, 400));

  // Check for ARCA errors
  const errMsg = xml.match(/<Msg>([\s\S]*?)<\/Msg>/)?.[1];
  if (errMsg && errMsg.trim()) {
    throw new Error(`WSFE error: ${errMsg.trim()}`);
  }

  const cbteNro = xml.match(/<CbteNro>(\d+)<\/CbteNro>/)?.[1];
  return parseInt(cbteNro ?? "0");
}

export interface VoucherData {
  PtoVta: number;
  CbteTipo: number;
  Concepto: number;
  DocTipo: number;
  DocNro: number;
  CondicionIVAReceptorId: number;
  CbteDesde: number;
  CbteHasta: number;
  CbteFch: string;
  FchServDesde?: string; // Required when Concepto=2 or 3 (YYYYMMDD)
  FchServHasta?: string;
  FchVtoPago?: string;
  ImpTotal: number;
  ImpTotConc: number;
  ImpNeto: number;
  ImpOpEx: number;
  ImpIVA: number;
  ImpTrib: number;
  MonId: string;
  MonCotiz: number;
}

/** FECAESolicitar — requests CAE for a new voucher */
export async function requestCAE(
  cuit: number,
  data: VoucherData,
  token: string,
  sign: string,
  production: boolean
): Promise<{ CAE: string; CAEFchVto: string }> {
  const url = wsfeUrl(production);

  // Conditional service dates (required when Concepto=2 or 3)
  const svcDates = (data.Concepto === 2 || data.Concepto === 3)
    ? `<ar:FchServDesde>${data.FchServDesde ?? data.CbteFch}</ar:FchServDesde><ar:FchServHasta>${data.FchServHasta ?? data.CbteFch}</ar:FchServHasta><ar:FchVtoPago>${data.FchVtoPago ?? data.CbteFch}</ar:FchVtoPago>`
    : "";

  const soap = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope" xmlns:ar="http://ar.gov.afip.dif.FEV1/"><soap12:Body><ar:FECAESolicitar>${authXml(token, sign, cuit)}<ar:FeCAEReq><ar:FeCabReq><ar:CantReg>1</ar:CantReg><ar:PtoVta>${data.PtoVta}</ar:PtoVta><ar:CbteTipo>${data.CbteTipo}</ar:CbteTipo></ar:FeCabReq><ar:FeDetReq><ar:FECAEDetRequest><ar:Concepto>${data.Concepto}</ar:Concepto><ar:DocTipo>${data.DocTipo}</ar:DocTipo><ar:DocNro>${data.DocNro}</ar:DocNro><ar:CbteDesde>${data.CbteDesde}</ar:CbteDesde><ar:CbteHasta>${data.CbteHasta}</ar:CbteHasta><ar:CbteFch>${data.CbteFch}</ar:CbteFch>${svcDates}<ar:ImpTotal>${data.ImpTotal.toFixed(2)}</ar:ImpTotal><ar:ImpTotConc>${data.ImpTotConc.toFixed(2)}</ar:ImpTotConc><ar:ImpNeto>${data.ImpNeto.toFixed(2)}</ar:ImpNeto><ar:ImpOpEx>${data.ImpOpEx.toFixed(2)}</ar:ImpOpEx><ar:ImpIVA>${data.ImpIVA.toFixed(2)}</ar:ImpIVA><ar:ImpTrib>${data.ImpTrib.toFixed(2)}</ar:ImpTrib><ar:MonId>${data.MonId}</ar:MonId><ar:MonCotiz>${data.MonCotiz}</ar:MonCotiz><ar:CondicionIVAReceptorId>${data.CondicionIVAReceptorId}</ar:CondicionIVAReceptorId></ar:FECAEDetRequest></ar:FeDetReq></ar:FeCAEReq></ar:FECAESolicitar></soap12:Body></soap12:Envelope>`;

  const xml = await soapPost(url, "FECAESolicitar", soap);
  console.log("[WSFE] FECAESolicitar response snippet:", xml.slice(0, 600));

  // Check for ARCA rejection
  const resultado = xml.match(/<Resultado>(.*?)<\/Resultado>/)?.[1];
  const errMsg = xml.match(/<Msg>([\s\S]*?)<\/Msg>/)?.[1];
  if (resultado === "R" || resultado === "X") {
    throw new Error(`ARCA rechazó la factura: ${errMsg ?? "Error desconocido"}`);
  }

  const cae = xml.match(/<CAE>(\d+)<\/CAE>/)?.[1] ?? "";
  const caeFchVto = xml.match(/<CAEFchVto>(\d+)<\/CAEFchVto>/)?.[1] ?? "";

  if (!cae) {
    throw new Error(`No se recibió CAE. Respuesta ARCA: ${xml.slice(0, 300)}`);
  }

  return { CAE: cae, CAEFchVto: caeFchVto };
}
