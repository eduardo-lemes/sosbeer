"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createDoc,
  updateDoc,
  deleteDoc,
  upsertByName,
  db,
  type Payable,
  type PayableStatus,
  type Supplier,
  type PayableCategoryDoc,
} from "@/lib/db";
import { normalizeMoneyInput } from "@/lib/money";
import { randomUUID } from "node:crypto";

export type PayablesFormState = { message?: string };

const requiredText = (message: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v : ""),
    z.string().trim().min(1, message),
  );

const optionalText = z.preprocess((v) => {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}, z.string().optional());

const moneySchema = z.preprocess(
  (v) => (typeof v === "string" ? v : ""),
  z
    .string()
    .trim()
    .min(1)
    .transform((v) => normalizeMoneyInput(v))
    .refine((v) => !Number.isNaN(Number(v)), "Valor inválido"),
);

const createSchema = z.object({
  description: requiredText("Descrição é obrigatória"),
  supplierName: optionalText,
  categoryName: optionalText,
  amount: moneySchema,
  dueDate: requiredText("Vencimento é obrigatório"),
  status: z.enum(["OPEN", "PAID", "CANCELED"]).optional(),
  paidAt: optionalText,
  repeatEnabled: z.preprocess((v) => (v ? "1" : ""), z.string().optional()),
  repeatMonths: optionalText,
  barcode: optionalText,
  note: optionalText,
});

function addMonthsUTC(date: Date, months: number) {
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const next = new Date(Date.UTC(y, m + months, 1, 0, 0, 0, 0));
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0, 0, 0, 0, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}

export async function createPayable(_prev: PayablesFormState, formData: FormData): Promise<PayablesFormState> {
  const parsed = createSchema.safeParse({
    description: formData.get("description"),
    supplierName: formData.get("supplierName"),
    categoryName: formData.get("categoryName"),
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate"),
    status: formData.get("status"),
    paidAt: formData.get("paidAt"),
    repeatEnabled: formData.get("repeatEnabled"),
    repeatMonths: formData.get("repeatMonths"),
    barcode: formData.get("barcode"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const data = parsed.data;
  const dueDate = new Date(`${data.dueDate}T00:00:00.000Z`);
  if (Number.isNaN(dueDate.getTime())) return { message: "Vencimento inválido" };

  const supplierName = data.supplierName?.trim() || null;
  const categoryName = data.categoryName?.trim() || null;

  const status: PayableStatus = (data.status as PayableStatus) ?? "OPEN";
  let paidAt: Date | null = null;
  if (status === "PAID") {
    if (!data.paidAt?.trim()) return { message: "Informe a data de pagamento." };
    paidAt = new Date(`${data.paidAt}T00:00:00.000Z`);
    if (Number.isNaN(paidAt.getTime())) return { message: "Data de pagamento inválida." };
  }

  const repeatOn = Boolean(data.repeatEnabled);
  const repeatMonthsRaw = (data.repeatMonths ?? "").replace(/[^\d]/g, "");
  const repeatCount = repeatOn ? Math.max(0, Math.min(60, Number(repeatMonthsRaw || "0"))) : 0;
  const recurrenceId = repeatCount > 0 ? randomUUID() : null;

  if (supplierName) await upsertByName<Supplier>("suppliers", supplierName);
  if (categoryName) await upsertByName<PayableCategoryDoc>("payableCategories", categoryName);

  const baseData = {
    status,
    description: data.description,
    supplierName,
    categoryName,
    barcode: data.barcode ?? null,
    amount: Number(data.amount),
    dueDate,
    paidAt,
    note: data.note ?? null,
    recurrenceId,
    recurrenceIdx: recurrenceId ? 0 : null,
    purchaseImportId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await createDoc<Payable>("payables", baseData);

  if (repeatCount > 0) {
    for (let i = 1; i <= repeatCount; i++) {
      await createDoc<Payable>("payables", {
        ...baseData,
        status: "OPEN" as PayableStatus,
        dueDate: addMonthsUTC(dueDate, i),
        paidAt: null,
        recurrenceIdx: i,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  revalidatePath("/payables");
  redirect("/payables");
}

export async function setPayableStatus(id: string, status: PayableStatus) {
  await updateDoc("payables", id, {
    status,
    paidAt: status === "PAID" ? new Date() : null,
  });
  revalidatePath("/payables");
}

export async function deletePayable(id: string) {
  await deleteDoc("payables", id);
  revalidatePath("/payables");
}
