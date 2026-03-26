"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createDoc,
  queryAll,
  deleteDoc,
  updateWhere,
  upsertByName,
  type Category,
  type Subcategory,
  type Brand,
  type Unit,
} from "@/lib/db";

export type CatalogFormState = { message?: string };

const nameSchema = z
  .string()
  .trim()
  .min(1, "Nome é obrigatório")
  .max(80, "Nome muito grande");

export async function createCategory(_prev: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message };

  const existing = await queryAll<Category>("categories", { where: [["name", "==", parsed.data]], limit: 1 });
  if (existing.length > 0) return { message: "Categoria já existe." };

  await createDoc<Category>("categories", { name: parsed.data, createdAt: new Date(), updatedAt: new Date() });
  revalidatePath("/catalog");
  return {};
}

const subcategorySchema = z.object({
  categoryId: z.string().trim().min(1, "Selecione uma categoria"),
  name: nameSchema,
});

export async function createSubcategory(_prev: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  const parsed = subcategorySchema.safeParse({
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message };

  const existing = await queryAll<Subcategory>("subcategories", {
    where: [["categoryId", "==", parsed.data.categoryId], ["name", "==", parsed.data.name]],
    limit: 1,
  });
  if (existing.length > 0) return { message: "Subcategoria já existe nessa categoria." };

  await createDoc<Subcategory>("subcategories", {
    categoryId: parsed.data.categoryId,
    name: parsed.data.name,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  revalidatePath("/catalog");
  return {};
}

export async function createBrand(_prev: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message };

  const existing = await queryAll<Brand>("brands", { where: [["name", "==", parsed.data]], limit: 1 });
  if (existing.length > 0) return { message: "Marca já existe." };

  await createDoc<Brand>("brands", { name: parsed.data, createdAt: new Date(), updatedAt: new Date() });
  revalidatePath("/catalog");
  return {};
}

export async function createUnit(_prev: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  const parsed = z.string().trim().min(1, "Nome é obrigatório").max(40, "Nome muito grande").safeParse(formData.get("name"));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message };

  const existing = await queryAll<Unit>("units", { where: [["name", "==", parsed.data]], limit: 1 });
  if (existing.length > 0) return { message: "Unidade já existe." };

  await createDoc<Unit>("units", { name: parsed.data, createdAt: new Date(), updatedAt: new Date() });
  revalidatePath("/catalog");
  return {};
}

export async function deleteCategory(categoryId: string) {
  const id = String(categoryId ?? "").trim();
  if (!id) throw new Error("Categoria inválida.");

  const subs = await queryAll<Subcategory>("subcategories", { where: [["categoryId", "==", id]] });
  const subIds = subs.map((s) => s.id);
  if (subIds.length > 0) {
    for (const subId of subIds) {
      await updateWhere("products", "subcategoryId", subId, { subcategoryId: null });
    }
  }
  await updateWhere("products", "categoryId", id, { categoryId: null, subcategoryId: null });
  // Delete subcategories of category
  for (const sub of subs) await deleteDoc("subcategories", sub.id);
  await deleteDoc("categories", id);

  revalidatePath("/catalog");
  revalidatePath("/products");
}

export async function deleteSubcategory(subcategoryId: string) {
  const id = String(subcategoryId ?? "").trim();
  if (!id) throw new Error("Subcategoria inválida.");

  await updateWhere("products", "subcategoryId", id, { subcategoryId: null });
  await deleteDoc("subcategories", id);

  revalidatePath("/catalog");
  revalidatePath("/products");
}

export async function deleteBrand(brandId: string) {
  const id = String(brandId ?? "").trim();
  if (!id) throw new Error("Marca inválida.");

  await updateWhere("products", "brandId", id, { brandId: null });
  await deleteDoc("brands", id);

  revalidatePath("/catalog");
  revalidatePath("/products");
}

export async function deleteUnit(unitId: string) {
  const id = String(unitId ?? "").trim();
  if (!id) throw new Error("Unidade inválida.");

  await updateWhere("products", "unitId", id, { unitId: null });
  await deleteDoc("units", id);

  revalidatePath("/catalog");
  revalidatePath("/products");
}
