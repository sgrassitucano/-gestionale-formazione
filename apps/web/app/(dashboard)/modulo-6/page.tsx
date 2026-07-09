"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { School, Users, Wallet, TrendingUp } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const COLORS = [
  "hsl(199 89% 30%)",
  "hsl(25 95% 53%)",
  "hsl(142 71% 35%)",
  "hsl(38 92% 50%)",
  "hsl(0 72% 51%)",
  "hsl(262 52% 47%)",
  "hsl(340 75% 55%)",
];

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
    if (preset === "custom") return { dataInizio: customStart, dataFine: customEnd };
    const dataFine = new Date();
    const dataInizio = new Date();
    dataInizio.setDate(dataInizio.getDate() - parseInt(preset));
    return { dataInizio: dataInizio.toISOString().split("T")[0], dataFine: dataFine.toISOString().split("T")[0] };
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
    } finally {
      setLoading(false);
    }
  };

  const pieData = kpi ? Object.entries(kpi.discentiPerCorso).map(([name, value]) => ({ name, value })) : [];
  const barData = kpi ? Object.entries(kpi.marginePerTipo).map(([name, value]) => ({ name, margine: value })) : [];

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-foreground mb-1">Report + KPI</h1>
      <p className="text-sm text-muted-foreground mb-6">Dashboard analitico e trend</p>

      <Card className="mb-6">
        <CardContent className="p-4 flex gap-4 items-end flex-wrap">
          <div>
            <Label>Periodo</Label>
            <div className="flex gap-1.5 mt-1.5">
              {(["30", "60", "90", "custom"] as RangePreset[]).map((p) => (
                <Button key={p} size="sm" variant={preset === p ? "default" : "outline"} onClick={() => setPreset(p)}>
                  {p === "custom" ? "Custom" : `${p} gg`}
                </Button>
              ))}
            </div>
          </div>

          {preset === "custom" && (
            <>
              <div className="space-y-1.5">
                <Label>Da</Label>
                <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>A</Label>
                <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>Corso</Label>
            <select value={corso} onChange={(e) => setCorso(e.target.value)} className="flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm">
              <option value="">Tutti</option>
              {corsi.map((c) => <option key={c.codice} value={c.codice}>{c.titolo}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {loading || !kpi ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <KpiCard label="Aule Attive" value={kpi.aulesAttiveCount} icon={School} color="text-primary" />
            <KpiCard label="Discenti Formati" value={kpi.discentiTotalCount} icon={Users} color="text-success" />
            <KpiCard label="Costo Medio/Discente" value={`€ ${kpi.costoMedioDiscente.toFixed(2)}`} icon={Wallet} color="text-warning" />
            <KpiCard label="Margine Totale" value={`€ ${kpi.margineTotale.toFixed(2)}`} icon={TrendingUp} color="text-accent" />
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <Card>
              <CardContent className="p-4" style={{ height: 300 }}>
                <p className="font-semibold text-foreground mb-2 text-sm">Discenti per Corso</p>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {pieData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4" style={{ height: 300 }}>
                <p className="font-semibold text-foreground mb-2 text-sm">Margine per Tipo Corso</p>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="margine" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4" style={{ height: 300 }}>
              <p className="font-semibold text-foreground mb-2 text-sm">Trend Ricavi Mensili</p>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={kpi.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--success))" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color }: any) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`h-9 w-9 rounded-lg bg-secondary flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
