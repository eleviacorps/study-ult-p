import { NextResponse } from "next/server";
import { getVault } from "@/lib/vault-parser";

export async function GET() {
  try {
    const vault = getVault();
    return NextResponse.json(vault);
  } catch (err) {
    console.error("Vault API error:", err);
    return NextResponse.json(
      { error: "Failed to load vault" },
      { status: 500 }
    );
  }
}
