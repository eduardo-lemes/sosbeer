"use server";

import { revalidatePath } from "next/cache";
import { updateAppSettings } from "@/lib/db";

export async function updateStockSettings(formData: FormData) {
  const allowNegativeStock = formData.get("allowNegativeStock") != null;
  await updateAppSettings({ allowNegativeStock });
  revalidatePath("/settings");
  revalidatePath("/stock");
  revalidatePath("/cash");
  revalidatePath("/products");
}
