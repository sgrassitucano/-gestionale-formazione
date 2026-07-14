"use client";

import Link from "next/link";
import {
  School,
  FileText,
  Receipt,
  BarChart3,
  Landmark,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const modules = [
  { id: 1, name: "Aule", desc: "Aule, corsi, docenti, calendario", icon: School, href: "/modulo-3/aule" },
  { id: 2, name: "Modulistica", desc: "Templates e generazione documenti", icon: FileText, href: "/modulo-4" },
  { id: 3, name: "Prefatturazione", desc: "Cosa fatturare questo mese", icon: Receipt, href: "/modulo-5" },
  { id: 4, name: "Report", desc: "Bilancio aule e KPI", icon: BarChart3, href: "/modulo-6" },
  { id: 5, name: "Centri Costo", desc: "Distribuzione costi per cantiere", icon: Landmark, href: "/modulo-7" },
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
            <li className="flex gap-2"><span className="font-semibold text-primary">1.</span> Crea corso in Anagrafica Corsi (Aule)</li>
            <li className="flex gap-2"><span className="font-semibold text-primary">2.</span> Crea aula: wizard con upload discenti incluso</li>
            <li className="flex gap-2"><span className="font-semibold text-primary">3.</span> Consulta Prefatturazione per il mese corrente</li>
            <li className="flex gap-2"><span className="font-semibold text-primary">4.</span> Report per bilancio/KPI, Centri Costo per distribuzione cantieri</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
