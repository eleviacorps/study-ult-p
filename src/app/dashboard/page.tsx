"use client";

import { useVaultStore } from "@/stores/vault-store";
import { Header } from "@/components/layout/header";
import { DashboardWidgets } from "@/components/dashboard/dashboard-widgets";

export default function DashboardPage() {
  const { vault, isLoaded } = useVaultStore();

  return (
    <div className="min-h-screen">
      <Header title="Dashboard" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
        {!isLoaded ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-36 sm:h-44 skeleton rounded-[20px]" />
            ))}
          </div>
        ) : (
          <DashboardWidgets vault={vault!} />
        )}
      </div>
    </div>
  );
}
