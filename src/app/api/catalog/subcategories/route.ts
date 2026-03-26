import { NextResponse } from "next/server";
import { z } from "zod";
import { queryAll, createDoc, type Category, type Subcategory } from "@/lib/db";

const schema = z.object({
  categoryName: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(80),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos" }, { status: 400 });

  const cats = await queryAll<Category>("categories", { where: [["name", "==", parsed.data.categoryName]], limit: 1 });
  if (cats.length === 0) return NextResponse.json({ message: "Categoria não encontrada" }, { status: 404 });
  const category = cats[0]!;

  const existing = await queryAll<Subcategory>("subcategories", {
    where: [["categoryId", "==", category.id], ["name", "==", parsed.data.name]],
    limit: 1,
  });
  if (existing.length > 0) return NextResponse.json({ name: existing[0]!.name, categoryName: category.name });

  const created = await createDoc<Subcategory>("subcategories", {
    categoryId: category.id,
    name: parsed.data.name,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return NextResponse.json({ name: created.name, categoryName: category.name });
}
