export type NfeItem = {
  name: string;
  ean: string | null;
  qty: number;
  unitPrice: number | null;
  total: number | null;
};

export function inferPackMultiplier(name: string): number | null {
  const text = name.toLowerCase().replace(/\s+/g, " ").trim();
  const patterns: RegExp[] = [
    /\bfd\s*x\s*(\d{1,3})\b/i,
    /\bcx\s*x\s*(\d{1,3})\b/i,
    /\bfardo\s*x\s*(\d{1,3})\b/i,
    /\bpack\s*x\s*(\d{1,3})\b/i,
    /\b(kit|combo)\s*x\s*(\d{1,3})\b/i,
    /\bx\s*(\d{1,3})\b/i,
    /\bc\/\s*(\d{1,3})\b/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m?.[1]) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n >= 2 && n <= 200) return n;
  }
  return null;
}

function firstMatch(xml: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = xml.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function parseDecimalNum(raw: string | null, fractionDigits: number): number | null {
  if (!raw) return null;
  const cleaned = String(raw).replace(",", ".").replace(/[^\d.]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Number(n.toFixed(fractionDigits));
}

export function parseNfeSummary(xmlRaw: string) {
  const xml = xmlRaw.trim();
  const supplierName = firstMatch(xml, [
    /<emit>[\s\S]*?<xNome>([^<]+)<\/xNome>[\s\S]*?<\/emit>/i,
    /<xNome>([^<]+)<\/xNome>/i,
  ]);
  const invoiceNumber = firstMatch(xml, [/<nNF>([^<]+)<\/nNF>/i]);
  const series = firstMatch(xml, [/<serie>([^<]+)<\/serie>/i]);
  const issuedAtRaw = firstMatch(xml, [/<dhEmi>([^<]+)<\/dhEmi>/i, /<dEmi>([^<]+)<\/dEmi>/i]);
  const issuedAt = issuedAtRaw ? new Date(issuedAtRaw) : null;
  const issuedAtOk = issuedAt && Number.isFinite(issuedAt.getTime()) ? issuedAt : null;
  const total = parseDecimalNum(firstMatch(xml, [/<vNF>([^<]+)<\/vNF>/i]), 2);
  const dueAtOk = parseNfeDueDate(xml);
  const hasNFeTag = /<nfeProc\b|<NFe\b/i.test(xml);
  return { supplierName, invoiceNumber, series, issuedAt: issuedAtOk, dueAt: dueAtOk, total, hasNFeTag };
}

export function parseNfeItems(xmlRaw: string): NfeItem[] {
  const xml = xmlRaw.trim();
  const detBlocks = Array.from(xml.matchAll(/<det\b[\s\S]*?<\/det>/gi)).map((m) => m[0]);
  const items: NfeItem[] = [];

  for (const det of detBlocks) {
    const prod = firstMatch(det, [/<prod>([\s\S]*?)<\/prod>/i]) ?? det;
    const nameRaw = firstMatch(prod, [/<xProd>([^<]+)<\/xProd>/i]) ?? "Item";
    const name = decodeXmlEntities(nameRaw);
    const ean = firstMatch(prod, [/<cEAN>([^<]+)<\/cEAN>/i, /<cean>([^<]+)<\/cean>/i]);
    const qty = parseDecimalNum(firstMatch(prod, [/<qCom>([^<]+)<\/qCom>/i, /<qTrib>([^<]+)<\/qTrib>/i]), 3) ?? 0;
    const unitPrice = parseDecimalNum(firstMatch(prod, [/<vUnCom>([^<]+)<\/vUnCom>/i, /<vUnTrib>([^<]+)<\/vUnTrib>/i]), 2);
    const total = parseDecimalNum(firstMatch(prod, [/<vProd>([^<]+)<\/vProd>/i]), 2);

    if (qty <= 0) continue;
    items.push({ name, ean: ean ? ean : null, qty, unitPrice, total });
  }

  return items;
}

function decodeXmlEntities(text: string) {
  const t = String(text ?? "");
  return t
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      if (!Number.isFinite(code)) return _;
      try {
        return String.fromCodePoint(code);
      } catch {
        return _;
      }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      if (!Number.isFinite(code)) return _;
      try {
        return String.fromCodePoint(code);
      } catch {
        return _;
      }
    });
}

function parseYMDToUTCDate(value: string): Date | null {
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const yyyy = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);
  if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null;
  const dt = new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0, 0));
  if (dt.getUTCFullYear() !== yyyy || dt.getUTCMonth() !== mm - 1 || dt.getUTCDate() !== dd) return null;
  return dt;
}

export function parseNfeDueDate(xmlRaw: string): Date | null {
  const xml = xmlRaw.trim();
  const matches = Array.from(xml.matchAll(/<dVenc>([^<]+)<\/dVenc>/gi)).map((m) => (m[1] ?? "").trim());
  const dates = matches
    .map((raw) => parseYMDToUTCDate(raw))
    .filter((d): d is Date => Boolean(d));
  if (dates.length === 0) return null;
  dates.sort((a, b) => a.getTime() - b.getTime());
  return dates[0];
}
