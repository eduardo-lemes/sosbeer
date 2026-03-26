import { NextResponse } from "next/server";
import { z } from "zod";
import { queryAll, upsertByName, type Unit } from "@/lib/db";

const schema = z.object({
  name: z.string().trim().min(1).max(40),
});

export async function GET() {
  const units = await queryAll<Unit>("units", { orderBy: [["name", "asc"]] });
  return NextResponse.json({ units: units.map((u) => u.name) });
}

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Nome inválido" }, { status: 400 });

  const unit = await upsertByName<Unit>("units", parsed.data.name);
  return NextResponse.json({ name: unit.name });
}
