import { NextResponse } from "next/server";
import { getVault } from "@/lib/vault-parser";

export async function GET() {
  try {
    const vault = getVault();
    return NextResponse.json(vault);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
