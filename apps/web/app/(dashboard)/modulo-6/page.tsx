"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

type RangePreset = "30" | "60" | "90" | "custom";

export default function Modulo6Page() {
  const [preset, setPreset] = useState<RangePreset>("30");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [corso, setCorso] = useState("");
  const [corsi, setCorsi] = useState<any[]>([]);
  const [kpi, setKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/corsi").then((res) => setCorsi(res.data.corsi || []));
  }, []);

  useEffect(() => {
    loadKpi();
  }, [preset, customStart, customEnd, corso]);

  const getDateRange = () => {
    if (preset === "custom") {
      return { dataInizio: customStart, dataFine: customEnd };
    }
    const dataFine = new Date();
    const dataInizio = new Date();
    dataInizio.setDate(dataInizio.getDate() - parseInt(preset));
    return {
      dataInizio: dataInizio.toISOString().split("T")[0],
      dataFine: dataFine.toISOString().split("T")[0],
    };
  };

  const loadKpi = async () => {
    setLoading(true);
    try {
      const { dataInizio, dataFine } = getDateRange();
      const params: any = {};
      if (dataInizio) params.dataInizio = dataInizio;
      if (dataFine) params.dataFine = dataFine;
      if (corso) params.corso = corso;

      const res = await axios.get("/api/reports/kpi", { params });
      setKpi(res.data.kpi);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const pieData = kpi
    ? Object.entries(kpi.discentiPerCorso).map(([name, value]) => ({ name, value }))
    : [];

  const barData = kpi
    ? Object.entries(kpi.marginePerTipo).map(([name, value]) => ({ name, margine: value }))
    : [];

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Modulo 6: Report + KPI</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4 items-end flex-wrap">
        <div>
          <label className="block text-sm font-medium mb-1">Periodo</label>
          <div className="flex gap-2">
            {(["30", "60", "90", "custom"] as RangePreset[]).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-3 py-2 rounded text-sm ${
                  preset === p ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {p === "custom" ? "Custom" : `${p} gg`}
              </button>
            ))}
          </div>
        </div>

        {preset === "custom" && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Da</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="border px-3 py-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">A</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="border px-3 py-2 rounded"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Corso</label>
          <select
            value={corso}
            onChange={(e) => setCorso(e.target.value)}
            className="border px-3 py-2 rounded"
          >
            <option value="">Tutti</option>
            {corsi.map((c) => (
              <option key={c.codice} value={c.codice}>{c.titolo}</option>
            ))}
          </select>
        </div>
      </div>

      {loading || !kpi ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <KpiCard label="Aule Attive" value={kpi.aulesAttiveCount} color="text-blue-600" />
            <KpiCard label="Discenti Formati" value={kpi.discentiTotalCount} color="text-green-600" />
            <KpiCard label="Costo Medio/Discente" value={`€ ${kpi.costoMedioDiscente.toFixed(2)}`} color="text-orange-600" />
            <KpiCard label="Margine Totale" value={`€ ${kpi.margineTotale.toFixed(2)}`} color="text-purple-600" />
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-4" style={{ height: 300 }}>
              <p className="font-semibold mb-2">Discenti per Corso</p>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow p-4" style={{ height: 300 }}>
              <p className="font-semibold mb-2">Margine per Tipo Corso</p>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="margine" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4" style={{ height: 300 }}>
            <p className="font-semibold mb-2">Trend Ricavi Mensili</p>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={kpi.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
