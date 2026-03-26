"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  db,
  newId,
  createDoc,
  updateDoc,
  getCurrentStock,
  allocateNextProductInternalCode,
  upsertByName,
  queryAll,
  getById,
  type Product,
  type Category,
  type Brand,
  type Unit,
  type Subcategory,
  type StockMovement,
} from "@/lib/db";
import { normalizeMoneyInput } from "@/lib/money";
import { getAppSettings } from "@/lib/settings";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { extname, join } from "node:path";
import { randomUUID } from "node:crypto";

export type FormState = { message?: string };

const MAX_IMAGE_BYTES = 1_500_000;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

const optionalMoneySchema = z.preprocess(
  (v) => (typeof v === "string" && v.trim() !== "" ? v : undefined),
  moneySchema.optional(),
);

const qtySchema = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(/[^\d]/g, "") : ""),
  z
    .string()
    .trim()
    .min(1)
    .refine((v) => /^\d+$/.test(v), "Quantidade inválida"),
);

const productSchema = z.object({
  name: requiredText("Nome é obrigatório"),
  internalCode: optionalText,
  eanGtin: optionalText,
  salePrice: moneySchema,
  costPrice: optionalMoneySchema,
  categoryName: optionalText,
  subcategoryName: optionalText,
  brandName: optionalText,
  unitName: optionalText,
  stockMin: optionalText,
  stockMax: optionalText,
  location: optionalText,
  notes: optionalText,
});

function intOrNull(value?: string): number | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  const only = v.replace(/\D/g, "");
  if (!only) return null;
  return Number(only);
}

function qtyOrNull(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const only = value.replace(/[^\d]/g, "").trim();
  if (!only) return null;
  return Number(only);
}

async function saveProductImage(file: File, productId: string): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Formato de imagem inválido. Use JPG, PNG ou WebP.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Imagem muito grande. Limite: 1,5MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const originalExt = extname(file.name || "").toLowerCase();
  const ext =
    originalExt === ".jpg" || originalExt === ".jpeg"
      ? ".jpg"
      : originalExt === ".png"
        ? ".png"
        : originalExt === ".webp"
          ? ".webp"
          : file.type === "image/png"
            ? ".png"
            : file.type === "image/webp"
              ? ".webp"
              : ".jpg";

  const dir = join(process.cwd(), "public", "uploads", "products");
  await mkdir(dir, { recursive: true });
  const filename = `${productId}-${randomUUID()}${ext}`;
  const full = join(dir, filename);
  await writeFile(full, buffer);
  return `/uploads/products/${filename}`;
}

async function deleteUploadedProductImage(url: string | null | undefined) {
  if (!url) return;
  if (!url.startsWith("/uploads/products/")) return;
  const full = join(process.cwd(), "public", url);
  try {
    await unlink(full);
  } catch {}
}

/* Check uniqueness of internalCode / eanGtin */
async function checkUniqueness(internalCode: string, eanGtin: string | null, excludeId?: string) {
  const byCode = await queryAll<Product>("products", {
    where: [["internalCode", "==", internalCode]],
    limit: 1,
  });
  if (byCode.length > 0 && byCode[0]!.id !== excludeId) {
    throw new Error("Código interno ou EAN já existe.");
  }
  if (eanGtin) {
    const byEan = await queryAll<Product>("products", {
      where: [["eanGtin", "==", eanGtin]],
      limit: 1,
    });
    if (byEan.length > 0 && byEan[0]!.id !== excludeId) {
      throw new Error("Código interno ou EAN já existe.");
    }
  }
}

async function resolveSubcategory(
  subcategoryName: string | null,
  category: Category | null,
): Promise<Subcategory | null> {
  if (!subcategoryName || !category) return null;
  const existing = await queryAll<Subcategory>("subcategories", {
    where: [
      ["categoryId", "==", category.id],
      ["name", "==", subcategoryName],
    ],
    limit: 1,
  });
  if (existing.length > 0) return existing[0]!;
  return createDoc<Subcategory>("subcategories", {
    name: subcategoryName,
    categoryId: category.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function createProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    internalCode: formData.get("internalCode"),
    eanGtin: formData.get("eanGtin"),
    salePrice: formData.get("salePrice"),
    costPrice: formData.get("costPrice"),
    categoryName: formData.get("categoryName"),
    subcategoryName: formData.get("subcategoryName"),
    brandName: formData.get("brandName"),
    unitName: formData.get("unitName"),
    stockMin: formData.get("stockMin"),
    stockMax: formData.get("stockMax"),
    location: formData.get("location"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const data = parsed.data;
  const trackStock = formData.get("trackStock") != null;
  const active = formData.get("active") != null;
  const image = formData.get("image");
  const stockAdjustTo = qtyOrNull(formData.get("stockAdjustTo"));
  const stockAdjustNote = typeof formData.get("stockAdjustNote") === "string" ? String(formData.get("stockAdjustNote")) : "";

  try {
    const settings = await getAppSettings();
    if (!settings.allowNegativeStock && stockAdjustTo != null && stockAdjustTo < 0) {
      return { message: "Operação bloqueada: estoque ficaria negativo." };
    }

    const internalCode = data.internalCode?.trim()
      ? data.internalCode.trim()
      : await allocateNextProductInternalCode();
    const eanGtin = data.eanGtin?.trim() ? data.eanGtin.trim() : null;
    const costPrice = data.costPrice ? Number(data.costPrice) : null;

    await checkUniqueness(internalCode, eanGtin);

    const categoryName = data.categoryName?.trim() || null;
    const brandName = data.brandName?.trim() || null;
    const unitName = data.unitName?.trim() || null;
    const subcategoryName = data.subcategoryName?.trim() || null;

    const category = categoryName ? await upsertByName<Category>("categories", categoryName) : null;
    const brand = brandName ? await upsertByName<Brand>("brands", brandName) : null;
    const unit = unitName ? await upsertByName<Unit>("units", unitName) : null;

    if (subcategoryName && !category) {
      return { message: "Informe a categoria para usar subcategoria." };
    }

    const subcategory = await resolveSubcategory(subcategoryName, category);

    const productId = newId();
    const now = new Date();
    await createDoc<Product>("products", {
      name: data.name,
      internalCode,
      eanGtin,
      imageUrl: null,
      salePrice: Number(data.salePrice),
      costPrice,
      trackStock,
      stockMin: intOrNull(data.stockMin),
      stockMax: intOrNull(data.stockMax),
      location: data.location?.trim() || null,
      notes: data.notes?.trim() || null,
      active,
      categoryId: category?.id ?? null,
      subcategoryId: subcategory?.id ?? null,
      brandId: brand?.id ?? null,
      unitId: unit?.id ?? null,
      createdAt: now,
      updatedAt: now,
    }, productId);

    if (trackStock && stockAdjustTo != null && stockAdjustTo !== 0) {
      await createDoc<StockMovement>("stockMovements", {
        productId,
        type: "ADJUSTMENT",
        quantity: Math.abs(stockAdjustTo),
        delta: stockAdjustTo,
        note: stockAdjustNote.trim() || "Ajuste pelo cadastro do produto",
        reference: null,
        saleId: null,
        createdBy: null,
        createdAt: now,
      });
    }

    if (image instanceof File && image.size > 0) {
      const url = await saveProductImage(image, productId);
      await updateDoc("products", productId, { imageUrl: url });
    }
  } catch (err) {
    if (err instanceof Error && (err.message.includes("subcategoria") || err.message.includes("EAN") || err.message.includes("imagem") || err.message.includes("negativo"))) {
      return { message: err.message };
    }
    throw err;
  }

  revalidatePath("/products");
  redirect("/products");
}

export async function updateProduct(
  productId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    internalCode: formData.get("internalCode"),
    eanGtin: formData.get("eanGtin"),
    salePrice: formData.get("salePrice"),
    costPrice: formData.get("costPrice"),
    categoryName: formData.get("categoryName"),
    subcategoryName: formData.get("subcategoryName"),
    brandName: formData.get("brandName"),
    unitName: formData.get("unitName"),
    stockMin: formData.get("stockMin"),
    stockMax: formData.get("stockMax"),
    location: formData.get("location"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const data = parsed.data;
  const trackStock = formData.get("trackStock") != null;
  const active = formData.get("active") != null;
  const internalCode = data.internalCode?.trim() ? data.internalCode.trim() : null;
  const eanGtin = data.eanGtin?.trim() ? data.eanGtin.trim() : null;
  const costPrice = data.costPrice ? Number(data.costPrice) : null;
  const image = formData.get("image");
  const stockAdjustTo = qtyOrNull(formData.get("stockAdjustTo"));
  const stockAdjustNote = typeof formData.get("stockAdjustNote") === "string" ? String(formData.get("stockAdjustNote")) : "";

  try {
    const prev = await getById<Product>("products", productId);
    const prevImageUrl = prev?.imageUrl ?? null;

    const settings = await getAppSettings();
    if (!settings.allowNegativeStock && trackStock && stockAdjustTo != null && stockAdjustTo < 0) {
      return { message: "Operação bloqueada: estoque ficaria negativo." };
    }

    if (internalCode) await checkUniqueness(internalCode, eanGtin, productId);

    const categoryName = data.categoryName?.trim() || null;
    const brandName = data.brandName?.trim() || null;
    const unitName = data.unitName?.trim() || null;
    const subcategoryName = data.subcategoryName?.trim() || null;

    const category = categoryName ? await upsertByName<Category>("categories", categoryName) : null;
    const brand = brandName ? await upsertByName<Brand>("brands", brandName) : null;
    const unit = unitName ? await upsertByName<Unit>("units", unitName) : null;

    if (subcategoryName && !category) {
      return { message: "Informe a categoria para usar subcategoria." };
    }

    const subcategory = await resolveSubcategory(subcategoryName, category);

    await updateDoc("products", productId, {
      name: data.name,
      ...(internalCode ? { internalCode } : {}),
      eanGtin,
      salePrice: Number(data.salePrice),
      costPrice,
      trackStock,
      stockMin: intOrNull(data.stockMin),
      stockMax: intOrNull(data.stockMax),
      location: data.location?.trim() || null,
      notes: data.notes?.trim() || null,
      active,
      categoryId: category?.id ?? null,
      subcategoryId: subcategory?.id ?? null,
      brandId: brand?.id ?? null,
      unitId: unit?.id ?? null,
    });

    if (trackStock && stockAdjustTo != null) {
      const current = await getCurrentStock(productId);
      const delta = stockAdjustTo - current;
      const quantity = Math.abs(delta);
      if (quantity !== 0) {
        const nextStock = current + delta;
        if (!settings.allowNegativeStock && nextStock < 0) {
          return { message: "Operação bloqueada: estoque ficaria negativo." };
        }
        await createDoc<StockMovement>("stockMovements", {
          productId,
          type: "ADJUSTMENT",
          quantity,
          delta,
          note: stockAdjustNote.trim() || "Ajuste pelo cadastro do produto",
          reference: null,
          saleId: null,
          createdBy: null,
          createdAt: new Date(),
        });
      }
    }

    if (image instanceof File && image.size > 0) {
      const url = await saveProductImage(image, productId);
      await updateDoc("products", productId, { imageUrl: url });
      await deleteUploadedProductImage(prevImageUrl);
    }
  } catch (err) {
    if (err instanceof Error && (err.message.includes("subcategoria") || err.message.includes("EAN") || err.message.includes("imagem") || err.message.includes("negativo"))) {
      return { message: err.message };
    }
    throw err;
  }

  revalidatePath("/products");
  redirect("/products");
}

const movementSchema = z.object({
  type: z.enum(["ENTRY", "EXIT", "ADJUSTMENT"]),
  quantity: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : typeof v === "string" ? v : undefined),
    qtySchema.optional(),
  ),
  newStock: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : typeof v === "string" ? v : undefined),
    qtySchema.optional(),
  ),
  note: optionalText,
});

export async function createMovement(
  productId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = movementSchema.safeParse({
    type: formData.get("type"),
    quantity: formData.get("quantity"),
    newStock: formData.get("newStock"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const current = await getCurrentStock(productId);
  const type = parsed.data.type as StockMovement["type"];
  const note = parsed.data.note?.trim() || null;

  let delta: number;
  let quantity: number;

  if (type === "ADJUSTMENT") {
    if (!parsed.data.newStock) return { message: "Informe o novo saldo." };
    const target = Number(parsed.data.newStock);
    delta = target - current;
    quantity = Math.abs(delta);
  } else {
    if (!parsed.data.quantity) return { message: "Informe a quantidade." };
    quantity = Number(parsed.data.quantity);
    delta = type === "ENTRY" ? quantity : -quantity;
  }

  if (quantity <= 0) return { message: "Quantidade precisa ser maior que zero." };

  const nextStock = current + delta;
  const settings = await getAppSettings();
  if (!settings.allowNegativeStock && nextStock < 0) {
    return { message: "Operação bloqueada: estoque ficaria negativo." };
  }

  await createDoc<StockMovement>("stockMovements", {
    productId,
    type,
    quantity,
    delta,
    note,
    reference: null,
    saleId: null,
    createdBy: null,
    createdAt: new Date(),
  });

  revalidatePath("/stock");
  revalidatePath("/movements");
  redirect("/stock");
}
