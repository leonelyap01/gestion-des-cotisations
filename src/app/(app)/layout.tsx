import { AppShell } from "@/components/AppShell";
import { DataProvider } from "@/components/DataProvider";

/**
 * Layout des pages protégées : le middleware garantit qu'une session
 * Supabase valide existe avant d'arriver ici.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DataProvider>
      <AppShell>{children}</AppShell>
    </DataProvider>
  );
}
