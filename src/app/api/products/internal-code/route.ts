import { NextResponse } from "next/server";
import { peekNextProductInternalCode } from "@/lib/internalCode";

export async function GET() {
  const code = await peekNextProductInternalCode();
  return NextResponse.json({ code });
}
