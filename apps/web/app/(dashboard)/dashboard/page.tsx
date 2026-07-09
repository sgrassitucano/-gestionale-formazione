"use client";

import Link from "next/link";

const modules = [
  { id: 1, name: "Autenticazione", desc: "Login e gestione permessi" },
  { id: 2, name: "Importazione", desc: "Upload XLS e catalogo corsi" },
  { id: 3, name: "Aule", desc: "Aule, lezioni, calendario" },
  { id: 4, name: "Modulistica", desc: "Templates e PDF" },
  { id: 5, name: "Prefatturazione", desc: "Bilancio e ricavi" },
  { id: 6, name: "Report", desc: "KPI e analytics" },
  { id: 7, name: "Centri Costo", desc: "Distribuzione costi" },
];

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Benvenuto
        </h1>
        <p className="text-gray-600">
          Gestionale Formazione Sicurezza — v0.1
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((mod) => (
          <Link
            key={mod.id}
            href={`/modulo-${mod.id}`}
            className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 border-l-4 border-blue-600"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Modulo {mod.id}: {mod.name}
            </h3>
            <p className="text-gray-600 text-sm">{mod.desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-12 bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Getting Started
        </h2>
        <ol className="list-decimal list-inside text-gray-700 space-y-2">
          <li>Importa XLS discenti (Modulo 2)</li>
          <li>Crea aula e assegna discenti/docenti (Modulo 3)</li>
          <li>Chiudi aula per generare bilancio (Modulo 5)</li>
          <li>Visualizza report e centri costo (Moduli 6, 7)</li>
        </ol>
      </div>
    </div>
  );
}
