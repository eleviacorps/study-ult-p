"use client";

import { useEffect } from "react";
import { useVaultStore } from "@/stores/vault-store";

export function VaultLoader() {
  const { loadVault, isLoaded, isLoading } = useVaultStore();

  useEffect(() => {
    if (!isLoaded && !isLoading) {
      loadVault();
    }
  }, [loadVault, isLoaded, isLoading]);

  return null;
}
