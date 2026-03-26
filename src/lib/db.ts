import { db } from "./firebase";
import { FieldPath, FieldValue, Timestamp } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";

/* ------------------------------------------------------------------ */
/*  ID helper                                                          */
/* ------------------------------------------------------------------ */
export function newId(): string {
  // cuid-like: use crypto random (same length as Prisma cuid)
  return randomUUID().replace(/-/g, "").slice(0, 25);
}

/* ------------------------------------------------------------------ */
/*  Date helpers (Firestore uses Timestamp)                            */
/* ------------------------------------------------------------------ */
export function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date();
}

/* ------------------------------------------------------------------ */
/*  Enums (replacing Prisma enums)                                     */
/* ------------------------------------------------------------------ */
export type StockMovementType = "ENTRY" | "EXIT" | "ADJUSTMENT";
export type SaleStatus = "COMPLETED" | "CANCELED";
export type PaymentMethod = "CASH" | "PIX" | "DEBIT" | "CREDIT";
export type PayableStatus = "OPEN" | "PAID" | "CANCELED";
export type PurchaseImportStatus = "IMPORTED" | "ERROR";
export type CashSessionMovementType = "SUPPLY" | "WITHDRAWAL";

/* ------------------------------------------------------------------ */
/*  Type definitions (replacing Prisma generated types)                */
/* ------------------------------------------------------------------ */
export interface Category {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Brand {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Unit {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayableCategoryDoc {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  internalCode: string;
  eanGtin: string | null;
  imageUrl: string | null;
  salePrice: number;
  costPrice: number | null;
  trackStock: boolean;
  stockMin: number | null;
  stockMax: number | null;
  location: string | null;
  notes: string | null;
  active: boolean;
  categoryId: string | null;
  subcategoryId: string | null;
  brandId: string | null;
  unitId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  delta: number;
  note: string | null;
  reference: string | null;
  saleId: string | null;
  createdBy: string | null;
  createdAt: Date;
}

export interface Counter {
  id: string;
  value: number;
  updatedAt: Date;
}

export interface AppSettings {
  id: string;
  allowNegativeStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Sale {
  id: string;
  number: number;
  status: SaleStatus;
  cashSessionId: string | null;
  subtotal: number;
  discount: number;
  total: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface SalePayment {
  id: string;
  saleId: string;
  method: PaymentMethod;
  amount: number;
}

export interface CashSession {
  id: string;
  openedAt: Date;
  openingCash: number;
  openNote: string | null;
  closedAt: Date | null;
  closingCash: number | null;
  closeNote: string | null;
  closingCounts: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface CashSessionMovement {
  id: string;
  cashSessionId: string;
  type: CashSessionMovementType;
  amount: number;
  note: string | null;
  createdAt: Date;
}

export interface Payable {
  id: string;
  status: PayableStatus;
  description: string;
  supplierName: string | null;
  categoryName: string | null;
  barcode: string | null;
  purchaseImportId: string | null;
  amount: number;
  dueDate: Date;
  paidAt: Date | null;
  note: string | null;
  recurrenceId: string | null;
  recurrenceIdx: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseImport {
  id: string;
  status: PurchaseImportStatus;
  filename: string | null;
  supplierName: string | null;
  invoiceNumber: string | null;
  series: string | null;
  issuedAt: Date | null;
  total: number | null;
  rawXml: string;
  errorMessage: string | null;
  createdAt: Date;
  appliedAt: Date | null;
}

/* ------------------------------------------------------------------ */
/*  Firestore document ↔ typed object helpers                          */
/* ------------------------------------------------------------------ */
function docToObj<T>(id: string, data: FirebaseFirestore.DocumentData): T {
  const obj: Record<string, unknown> = { id, ...data };
  // Convert all Timestamp fields to Date
  for (const [k, v] of Object.entries(obj)) {
    if (v instanceof Timestamp) obj[k] = v.toDate();
  }
  return obj as T;
}

/* ------------------------------------------------------------------ */
/*  Collection references                                              */
/* ------------------------------------------------------------------ */
export const collections = {
  products: () => db.collection("products"),
  categories: () => db.collection("categories"),
  subcategories: () => db.collection("subcategories"),
  brands: () => db.collection("brands"),
  units: () => db.collection("units"),
  suppliers: () => db.collection("suppliers"),
  payableCategories: () => db.collection("payableCategories"),
  stockMovements: () => db.collection("stockMovements"),
  counters: () => db.collection("counters"),
  sales: () => db.collection("sales"),
  saleItems: () => db.collection("saleItems"),
  salePayments: () => db.collection("salePayments"),
  cashSessions: () => db.collection("cashSessions"),
  cashSessionMovements: () => db.collection("cashSessionMovements"),
  payables: () => db.collection("payables"),
  purchaseImports: () => db.collection("purchaseImports"),
};

/* ------------------------------------------------------------------ */
/*  Generic CRUD helpers                                               */
/* ------------------------------------------------------------------ */
export async function getById<T>(collection: string, id: string): Promise<T | null> {
  const snap = await db.collection(collection).doc(id).get();
  if (!snap.exists) return null;
  return docToObj<T>(snap.id, snap.data()!);
}

export async function queryAll<T>(
  collection: string,
  opts?: {
    where?: Array<[string, FirebaseFirestore.WhereFilterOp, unknown]>;
    orderBy?: Array<[string, "asc" | "desc"]>;
    limit?: number;
  },
): Promise<T[]> {
  let q: FirebaseFirestore.Query = db.collection(collection);
  const hasWhere = (opts?.where ?? []).length > 0;
  const orderSpecs = opts?.orderBy ?? [];

  for (const [field, op, val] of opts?.where ?? []) {
    const fieldRef = field === "__name__" ? FieldPath.documentId() : field;
    q = q.where(fieldRef, op, val);
  }

  // Only apply orderBy at Firestore level when there's no where clause,
  // otherwise sort client-side to avoid composite index requirements.
  if (!hasWhere) {
    for (const [field, dir] of orderSpecs) q = q.orderBy(field, dir);
    if (opts?.limit) q = q.limit(opts.limit);
  }

  const snap = await q.get();
  let results = snap.docs.map((d) => docToObj<T>(d.id, d.data()));

  // Client-side sort when where was used
  if (hasWhere && orderSpecs.length > 0) {
    results.sort((a, b) => {
      for (const [field, dir] of orderSpecs) {
        const va = (a as Record<string, unknown>)[field];
        const vb = (b as Record<string, unknown>)[field];
        let cmp = 0;
        if (va instanceof Date && vb instanceof Date) cmp = va.getTime() - vb.getTime();
        else if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
        else if (typeof va === "string" && typeof vb === "string") cmp = va.localeCompare(vb, "pt-BR");
        else if (va == null && vb != null) cmp = -1;
        else if (va != null && vb == null) cmp = 1;
        if (cmp !== 0) return dir === "desc" ? -cmp : cmp;
      }
      return 0;
    });
  }

  // Client-side limit when where was used
  if (hasWhere && opts?.limit && results.length > opts.limit) {
    results = results.slice(0, opts.limit);
  }

  return results;
}

export async function createDoc<T>(
  collection: string,
  data: Omit<T, "id">,
  id?: string,
): Promise<T> {
  const docId = id ?? newId();
  const now = new Date();
  const payload: Record<string, unknown> = {
    ...data,
    createdAt: data && typeof data === "object" && "createdAt" in data ? (data as Record<string, unknown>).createdAt : now,
  };
  if (!("updatedAt" in payload)) payload.updatedAt = now;
  await db.collection(collection).doc(docId).set(payload);
  return { ...payload, id: docId } as T;
}

export async function updateDoc(
  collection: string,
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  await db.collection(collection).doc(id).update({ ...data, updatedAt: new Date() });
}

export async function deleteDoc(collection: string, id: string): Promise<void> {
  await db.collection(collection).doc(id).delete();
}

/* ------------------------------------------------------------------ */
/*  Upsert by unique field (replaces Prisma upsert)                    */
/* ------------------------------------------------------------------ */
export async function upsertByName<T extends { id: string; name: string }>(
  collection: string,
  name: string,
): Promise<T> {
  const snap = await db.collection(collection).where("name", "==", name).limit(1).get();
  if (!snap.empty) return docToObj<T>(snap.docs[0]!.id, snap.docs[0]!.data());
  const id = newId();
  const now = new Date();
  const data = { name, createdAt: now, updatedAt: now };
  await db.collection(collection).doc(id).set(data);
  return { ...data, id } as unknown as T;
}

/* ------------------------------------------------------------------ */
/*  Stock helpers                                                      */
/* ------------------------------------------------------------------ */
export async function getCurrentStock(productId: string): Promise<number> {
  const snap = await db
    .collection("stockMovements")
    .where("productId", "==", productId)
    .get();
  let sum = 0;
  for (const doc of snap.docs) sum += (doc.data().delta as number) ?? 0;
  return sum;
}

export async function getStockByProductIds(productIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (productIds.length === 0) return map;

  // Firestore "in" supports max 30 values per query
  const chunks: string[][] = [];
  for (let i = 0; i < productIds.length; i += 30) {
    chunks.push(productIds.slice(i, i + 30));
  }

  for (const chunk of chunks) {
    const snap = await db
      .collection("stockMovements")
      .where("productId", "in", chunk)
      .get();
    for (const doc of snap.docs) {
      const d = doc.data();
      const pid = d.productId as string;
      map.set(pid, (map.get(pid) ?? 0) + ((d.delta as number) ?? 0));
    }
  }

  return map;
}

/* ------------------------------------------------------------------ */
/*  Counter helpers                                                    */
/* ------------------------------------------------------------------ */
export async function incrementCounter(counterId: string): Promise<number> {
  const ref = db.collection("counters").doc(counterId);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    let current = 0;
    if (snap.exists) {
      current = (snap.data()?.value as number) ?? 0;
    }
    const next = current + 1;
    tx.set(ref, { value: next, updatedAt: new Date() });
    return next;
  });
  return result;
}

export async function peekCounter(counterId: string): Promise<number> {
  const snap = await db.collection("counters").doc(counterId).get();
  return ((snap.data()?.value as number) ?? 0) + 1;
}

/* Also need to initialize counter from max existing value if first time */
export async function ensureProductCodeCounter(): Promise<number> {
  const ref = db.collection("counters").doc("product_internal_code");
  const snap = await ref.get();
  if (snap.exists) return (snap.data()?.value as number) ?? 0;

  // Scan all products to find max numeric internal code
  const products = await db.collection("products").select("internalCode").get();
  let max = 0;
  for (const doc of products.docs) {
    const code = doc.data().internalCode as string;
    if (!code) continue;
    const digits = code.replace(/\D/g, "");
    if (!digits) continue;
    const n = Number(digits);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  await ref.set({ value: max, updatedAt: new Date() });
  return max;
}

export async function allocateNextProductInternalCode(): Promise<string> {
  await ensureProductCodeCounter();
  const next = await incrementCounter("product_internal_code");
  return String(next).padStart(6, "0");
}

export async function peekNextProductInternalCode(): Promise<string> {
  await ensureProductCodeCounter();
  return String(await peekCounter("product_internal_code")).padStart(6, "0");
}

export async function allocateNextSaleNumber(): Promise<number> {
  const ref = db.collection("counters").doc("sale_number");
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({ value: 0, updatedAt: new Date() });
  }
  return incrementCounter("sale_number");
}

export async function peekNextSaleNumber(): Promise<number> {
  const snap = await db.collection("counters").doc("sale_number").get();
  return ((snap.data()?.value as number) ?? 0) + 1;
}

/* ------------------------------------------------------------------ */
/*  Settings                                                           */
/* ------------------------------------------------------------------ */
export async function getAppSettings(): Promise<AppSettings> {
  const ref = db.collection("settings").doc("default");
  const snap = await ref.get();
  if (!snap.exists) {
    const defaults: AppSettings = {
      id: "default",
      allowNegativeStock: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await ref.set(defaults);
    return defaults;
  }
  return docToObj<AppSettings>("default", snap.data()!);
}

export async function updateAppSettings(data: Partial<AppSettings>): Promise<void> {
  const ref = db.collection("settings").doc("default");
  await ref.set({ ...data, updatedAt: new Date() }, { merge: true });
}

/* ------------------------------------------------------------------ */
/*  Batch delete helpers                                               */
/* ------------------------------------------------------------------ */
export async function deleteWhere(collection: string, field: string, value: unknown): Promise<number> {
  const snap = await db.collection(collection).where(field, "==", value).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  for (const doc of snap.docs) batch.delete(doc.ref);
  await batch.commit();
  return snap.size;
}

export async function updateWhere(
  collection: string,
  field: string,
  value: unknown,
  data: Record<string, unknown>,
): Promise<number> {
  const snap = await db.collection(collection).where(field, "==", value).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  for (const doc of snap.docs) batch.update(doc.ref, { ...data, updatedAt: new Date() });
  await batch.commit();
  return snap.size;
}

/* Re-export db and FieldValue for convenience */
export { db, FieldValue, FieldPath };
