import { NextResponse } from "next/server";
import { z } from "zod";
import { queryAll, upsertByName, type PayableCategoryDoc } from "@/lib/db";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function GET() {
  const categories = await queryAll<PayableCategoryDoc>("payableCategories", { orderBy: [["name", "asc"]] });
  return NextResponse.json({ categories: categories.map((c) => c.name) });
}

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Nome inválido" }, { status: 400 });

  const cat = await upsertByName<PayableCategoryDoc>("payableCategories", parsed.data.name);
  return NextResponse.json({ name: cat.name });
}
