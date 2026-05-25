import { NextRequest, NextResponse } from "next/server";
import { getVault } from "@/lib/vault-parser";
import type { VaultRoot } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const rootsParam = req.nextUrl.searchParams.get("roots");
    let extraRoots: VaultRoot[] | undefined;
    if (rootsParam) {
      try {
        extraRoots = JSON.parse(rootsParam);
      } catch {}
    }
    const vault = getVault(extraRoots);
    return NextResponse.json(vault);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
