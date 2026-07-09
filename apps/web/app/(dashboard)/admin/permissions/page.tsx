"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const RUOLI = ["SUPERADMIN", "SEGRETERIA", "AMMINISTRAZIONE", "VISUALIZZATORE"];
const MODULI = [
  { id: 1, name: "Autenticazione" },
  { id: 2, name: "Importazione" },
  { id: 3, name: "Aule" },
  { id: 4, name: "Modulistica" },
  { id: 5, name: "Prefatturazione" },
  { id: 6, name: "Report" },
  { id: 7, name: "Centri Costo" },
];

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await axios.get("/api/permissions");
      setPermissions(res.data.permissions || []);
    } finally {
      setLoading(false);
    }
  };

  const isVisible = (ruolo: string, moduloId: number) => {
    const p = permissions.find((x) => x.ruolo === ruolo && x.moduloId === moduloId);
    return p ? p.visible : true;
  };

  const handleToggle = async (ruolo: string, moduloId: number) => {
    const current = isVisible(ruolo, moduloId);
    await axios.put(`/api/permissions/${moduloId}`, { ruolo, visible: !current });
    load();
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-foreground mb-1">Permessi Moduli</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Configura la visibilità di ogni modulo per ruolo (Superadmin ha sempre accesso completo)
      </p>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modulo</TableHead>
                {RUOLI.map((r) => <TableHead key={r} className="text-center">{r}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {MODULI.map((mod) => (
                <TableRow key={mod.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    {mod.id}. {mod.name}
                  </TableCell>
                  {RUOLI.map((ruolo) => (
                    <TableCell key={ruolo} className="text-center">
                      <button
                        onClick={() => ruolo !== "SUPERADMIN" && handleToggle(ruolo, mod.id)}
                        disabled={ruolo === "SUPERADMIN"}
                        className={`h-5 w-9 rounded-full transition-colors relative ${
                          ruolo === "SUPERADMIN" || isVisible(ruolo, mod.id) ? "bg-primary" : "bg-secondary"
                        } ${ruolo === "SUPERADMIN" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                            ruolo === "SUPERADMIN" || isVisible(ruolo, mod.id) ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
