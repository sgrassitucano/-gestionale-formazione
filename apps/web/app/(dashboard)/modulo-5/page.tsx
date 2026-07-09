"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function Modulo5Page() {
  const [tab, setTab] = useState<"report" | "listini">("report");

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Modulo 5: Prefatturazione</h1>

      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setTab("report")}
          className={`pb-2 px-2 ${tab === "report" ? "border-b-2 border-blue-600 font-semibold" : "text-gray-500"}`}
        >
          Report Bilancio
        </button>
        <button
          onClick={() => setTab("listini")}
          className={`pb-2 px-2 ${tab === "listini" ? "border-b-2 border-blue-600 font-semibold" : "text-gray-500"}`}
        >
          Listini Prezzi
        </button>
      </div>

      {tab === "report" ? <ReportTab /> : <ListiniTab />}
    </div>
  );
}

function ReportTab() {
  const [mese, setMese] = useState("");
  const [corso, setCorso] = useState("");
  const [corsi, setCorsi] = useState<any[]>([]);
  const [report, setReport] = useState<any[]>([]);
  const [totals, setTotals] = useState({ ricavo: 0, costo: 0, margine: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get("/api/corsi").then((res) => setCorsi(res.data.corsi || []));
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (mese) params.mese = mese;
      if (corso) params.corso = corso;

      const res = await axios.get("/api/reports/prefatturazione", { params });
      setReport(res.data.report || []);
      setTotals(res.data.totals || { ricavo: 0, costo: 0, margine: 0 });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (mese) params.append("mese", mese);
    if (corso) params.append("corso", corso);
    params.append("format", "xlsx");
    window.open(`/api/reports/prefatturazione?${params.toString()}`, "_blank");
  };

  const chartData = report.map((r) => ({
    name: r.corsoCodice,
    Ricavo: r.ricavo,
    Costo: r.costo,
    Margine: r.margine,
  }));

  return (
    <div>
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Mese</label>
          <input
            type="month"
            value={mese}
            onChange={(e) => setMese(e.target.value)}
            className="border px-3 py-2 rounded"
          />
        </div>
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
        <button onClick={loadReport} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Applica Filtri
        </button>
        <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          Export XLS
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Ricavo Totale</p>
          <p className="text-2xl font-bold text-green-600">€ {totals.ricavo.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Costo Totale</p>
          <p className="text-2xl font-bold text-red-600">€ {totals.costo.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Margine Totale</p>
          <p className="text-2xl font-bold text-blue-600">€ {totals.margine.toFixed(2)}</p>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6" style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Ricavo" fill="#22c55e" />
              <Bar dataKey="Costo" fill="#ef4444" />
              <Bar dataKey="Margine" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Corso</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Discenti</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Ricavo</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Costo</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Margine</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">%</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Chiusura</th>
            </tr>
          </thead>
          <tbody>
            {report.map((r) => (
              <tr key={r.aulaId} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{r.corso}</td>
                <td className="px-4 py-3 text-sm">{r.discentiCount}</td>
                <td className="px-4 py-3 text-sm">€ {r.ricavo.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm">€ {r.costo.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm font-semibold">€ {r.margine.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm">{r.marginePct.toFixed(1)}%</td>
                <td className="px-4 py-3 text-sm">{new Date(r.dataChiusura).toLocaleDateString("it-IT")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ListiniTab() {
  const [listini, setListini] = useState<any[]>([]);
  const [corsi, setCorsi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ corsoCodec: "", tipoErogazione: "AULA_FAD", costo: 0 });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [listiniRes, corsiRes] = await Promise.all([
        axios.get("/api/listini"),
        axios.get("/api/corsi"),
      ]);
      setListini(listiniRes.data.listini || []);
      setCorsi(corsiRes.data.corsi || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("/api/listini", form);
      setForm({ corsoCodec: "", tipoErogazione: "AULA_FAD", costo: 0 });
      load();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6 flex gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Corso</label>
          <select
            value={form.corsoCodec}
            onChange={(e) => setForm({ ...form, corsoCodec: e.target.value })}
            className="border px-3 py-2 rounded"
            required
          >
            <option value="">Seleziona corso</option>
            {corsi.map((c) => (
              <option key={c.codice} value={c.codice}>{c.titolo}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tipo Erogazione</label>
          <select
            value={form.tipoErogazione}
            onChange={(e) => setForm({ ...form, tipoErogazione: e.target.value })}
            className="border px-3 py-2 rounded"
          >
            <option value="AULA_FAD">Aula/FAD</option>
            <option value="E_LEARNING">E-Learning</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Costo (€)</label>
          <input
            type="number"
            step="0.01"
            value={form.costo}
            onChange={(e) => setForm({ ...form, costo: parseFloat(e.target.value) })}
            className="border px-3 py-2 rounded w-32"
            required
          />
        </div>
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          Salva Listino
        </button>
      </form>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Corso</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Tipo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Costo</th>
            </tr>
          </thead>
          <tbody>
            {listini.map((l) => (
              <tr key={l.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-3 text-sm">{l.corso.titolo}</td>
                <td className="px-6 py-3 text-sm">{l.tipoErogazione}</td>
                <td className="px-6 py-3 text-sm">€ {Number(l.costo).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
