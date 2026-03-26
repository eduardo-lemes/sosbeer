"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createDoc,
  queryAll,
  updateDoc,
  type CashSession,
  type CashSessionMovement,
  type CashSessionMovementType,
} from "@/lib/db";
import { normalizeMoneyInput } from "@/lib/money";

export type CashSessionFormState = { message?: string };

function parseAmountBRL(raw: unknown, label: string): number {
  const normalized = normalizeMoneyInput(raw);
  const n = Number(normalized);
  if (!normalized || Number.isNaN(n)) throw new Error(`${label}: valor inválido.`);
  if (n < 0) throw new Error(`${label}: não pode ser negativo.`);
  return n;
}

export async function openCashSession(_prev: CashSessionFormState, formData: FormData): Promise<CashSessionFormState> {
  try {
    const openingCash = parseAmountBRL(formData.get("openingCash"), "Abertura");
    const openNote = String(formData.get("openNote") ?? "").trim() || null;

    const existing = await queryAll<CashSession>("cashSessions", {
      where: [["closedAt", "==", null]],
      limit: 1,
    });
    if (existing.length > 0) throw new Error("Já existe um caixa aberto.");

    await createDoc<CashSession>("cashSessions", {
      openedAt: new Date(),
      openingCash,
      openNote,
      closedAt: null,
      closingCash: null,
      closeNote: null,
      closingCounts: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    revalidatePath("/cash");
    revalidatePath("/cash/session");
    redirect("/cash");
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Não foi possível abrir o caixa." };
  }
}

export async function closeCashSession(_prev: CashSessionFormState, formData: FormData): Promise<CashSessionFormState> {
  try {
    const closingCash = parseAmountBRL(formData.get("closingCash"), "Fechamento");
    const closeNote = String(formData.get("closeNote") ?? "").trim() || null;

    const sessions = await queryAll<CashSession>("cashSessions", {
      where: [["closedAt", "==", null]],
      orderBy: [["openedAt", "desc"]],
      limit: 1,
    });
    if (sessions.length === 0) throw new Error("Não existe caixa aberto.");

    await updateDoc("cashSessions", sessions[0]!.id, {
      closedAt: new Date(),
      closingCash,
      closeNote,
    });

    revalidatePath("/cash");
    revalidatePath("/cash/session");
    revalidatePath("/sales");
    redirect("/cash/session");
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Não foi possível fechar o caixa." };
  }
}

export async function addCashSessionMovement(
  _prev: CashSessionFormState,
  formData: FormData,
): Promise<CashSessionFormState> {
  try {
    const type = String(formData.get("type") ?? "");
    if (type !== "SUPPLY" && type !== "WITHDRAWAL") throw new Error("Tipo inválido.");
    const amount = parseAmountBRL(formData.get("amount"), "Valor");
    if (amount === 0) throw new Error("Informe um valor maior que zero.");
    const note = String(formData.get("note") ?? "").trim() || null;

    const sessions = await queryAll<CashSession>("cashSessions", {
      where: [["closedAt", "==", null]],
      orderBy: [["openedAt", "desc"]],
      limit: 1,
    });
    if (sessions.length === 0) throw new Error("Não existe caixa aberto.");

    await createDoc<CashSessionMovement>("cashSessionMovements", {
      cashSessionId: sessions[0]!.id,
      type: type as CashSessionMovementType,
      amount,
      note,
      createdAt: new Date(),
    });

    revalidatePath("/cash/session");
    redirect("/cash/session");
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Não foi possível registrar a movimentação." };
  }
}
