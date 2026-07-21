"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { type SessionUser } from "@gestionale/types";
import { Sidebar } from "@/components/layout/Sidebar";
import { UserMenu } from "@/components/layout/UserMenu";

const MODULE_NAMES: Record<number, string> = {
  1: "Aule",
  2: "Modulistica",
  3: "Prefatturazione",
  4: "Report",
  5: "Centri Costo",
};

const MODULE_ROUTES: Record<number, string> = {
  1: "/modulo-3/aule",
  2: "/modulo-4",
  3: "/modulo-5",
  4: "/modulo-6",
  5: "/modulo-7",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await axios.get("/api/auth/me");
        if (response.data.user) {
          setUser(response.data.user);

          // Load permissions
          const permsResponse = await axios.get("/api/permissions");
          if (permsResponse.data.permissions) {
            // /api/permissions restituisce le righe di TUTTI i ruoli (serve
            // a mostrare la matrice nella pagina admin/permissions), non
            // solo quelle dell'utente loggato — bug reale trovato: il
            // reduce precedente prendeva la PRIMA riga per moduloId
            // incontrata nell'array, che poteva appartenere a un ruolo
            // diverso da quello dell'utente corrente (l'ordine non è
            // raggruppato per ruolo). Va filtrato per ruolo PRIMA di
            // costruire il menu, non durante.
            const permessiUtente = permsResponse.data.permissions.filter(
              (p: any) => p.ruolo === response.data.user.ruolo
            );
            const modulesWithNames = permessiUtente
              .map((perm: any) => ({
                id: perm.moduloId,
                name: MODULE_NAMES[perm.moduloId],
                route: MODULE_ROUTES[perm.moduloId],
                visible: perm.visible,
              }))
              .sort((a: any, b: any) => a.id - b.id);

            setModules(modulesWithNames);
          }
        }
      } catch (error) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-secondary/30">
      <Sidebar user={user} modules={modules} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b border-border px-6 py-3.5 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Gestionale Formazione</h1>
          <UserMenu user={user} />
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
