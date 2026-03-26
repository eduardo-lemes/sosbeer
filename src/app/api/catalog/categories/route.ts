import { NextResponse } from "next/server";
import { z } from "zod";
import { queryAll, createDoc, type Category } from "@/lib/db";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Nome inválido" }, { status: 400 });

  const existing = await queryAll<Category>("categories", { where: [["name", "==", parsed.data.name]], limit: 1 });
  if (existing.length > 0) return NextResponse.json({ name: existing[0]!.name });

  const created = await createDoc<Category>("categories", {
    name: parsed.data.name,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return NextResponse.json({ name: created.name });
}
