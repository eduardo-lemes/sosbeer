import { NextResponse } from "next/server";
import { z } from "zod";
import { upsertByName, type Brand } from "@/lib/db";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Nome inválido" }, { status: 400 });

  const brand = await upsertByName<Brand>("brands", parsed.data.name);
  return NextResponse.json({ name: brand.name });
}
