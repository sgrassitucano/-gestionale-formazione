"use client";

import Link from "next/link";
import {
  Upload,
  School,
  FileText,
  Receipt,
  BarChart3,
  Landmark,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const modules = [
  { id: 1, name: "Autenticazione", desc: "Login e gestione permessi", icon: ShieldCheck, href: "/admin/permissions" },
  { id: 2, name: "Importazione", desc: "Upload XLS e catalogo corsi", icon: Upload, href: "/modulo-2/importazione" },
  { id: 3, name: "Aule", desc: "Aule, lezioni, calendario", icon: School, href: "/modulo-3/aule" },
  { id: 4, name: "Modulistica", desc: "Templates e PDF", icon: FileText, href: "/modulo-4" },
  { id: 5, name: "Prefatturazione", desc: "Bilancio e ricavi", icon: Receipt, href: "/modulo-5" },
  { id: 6, name: "Report", desc: "KPI e analytics", icon: BarChart3, href: "/modulo-6" },
  { id: 7, name: "Centri Costo", desc: "Distribuzione costi", icon: Landmark, href: "/modulo-7" },
];

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1">Benvenuto</h1>
        <p className="text-muted-foreground">Gestionale Formazione Sicurezza — v0.1</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link key={mod.id} href={mod.href}>
              <Card className="hover:shadow-md hover:border-primary/40 transition-all group cursor-pointer h-full">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">Modulo {mod.id}</p>
                    <h3 className="font-semibold text-foreground">{mod.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{mod.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="mt-8 bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <h2 className="font-semibold text-foreground mb-3">Getting Started</h2>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="font-semibold text-primary">1.</span> Importa XLS discenti (Modulo 2)</li>
            <li className="flex gap-2"><span className="font-semibold text-primary">2.</span> Crea aula e assegna discenti/docenti (Modulo 3)</li>
            <li className="flex gap-2"><span className="font-semibold text-primary">3.</span> Chiudi aula per generare bilancio (Modulo 5)</li>
            <li className="flex gap-2"><span className="font-semibold text-primary">4.</span> Visualizza report e centri costo (Moduli 6, 7)</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
