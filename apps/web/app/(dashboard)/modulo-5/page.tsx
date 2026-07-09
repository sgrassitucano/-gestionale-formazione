"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Download, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default function Modulo5Page() {
  const [tab, setTab] = useState<"report" | "listini">("report");

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-foreground mb-1">Prefatturazione</h1>
      <p className="text-sm text-muted-foreground mb-6">Bilancio, listini e report ricavi</p>

      <div className="flex gap-1 mb-6 bg-secondary/60 p-1 rounded-lg w-fit">
        <Button variant={tab === "report" ? "default" : "ghost"} size="sm" onClick={() => setTab("report")}>
          Report Bilancio
        </Button>
        <Button variant={tab === "listini" ? "default" : "ghost"} size="sm" onClick={() => setTab("listini")}>
          Listini Prezzi
        </Button>
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

  useEffect(() => {
    axios.get("/api/corsi").then((res) => setCorsi(res.data.corsi || []));
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      const params: any = {};
      if (mese) params.mese = mese;
      if (corso) params.corso = corso;
      const res = await axios.get("/api/reports/prefatturazione", { params });
      setReport(res.data.report || []);
      setTotals(res.data.totals || { ricavo: 0, costo: 0, margine: 0 });
    } catch (error) {
      console.error(error);
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (mese) params.append("mese", mese);
    if (corso) params.append("corso", corso);
    params.append("format", "xlsx");
    window.open(`/api/reports/prefatturazione?${params.toString()}`, "_blank");
  };

  const chartData = report.map((r) => ({ name: r.corsoCodice, Ricavo: r.ricavo, Costo: r.costo, Margine: r.margine }));

  return (
    <div>
      <Card className="mb-6">
        <CardContent className="p-4 flex gap-4 items-end flex-wrap">
          <div className="space-y-1.5">
            <Label>Mese</Label>
            <Input type="month" value={mese} onChange={(e) => setMese(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Corso</Label>
            <select value={corso} onChange={(e) => setCorso(e.target.value)} className="flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm">
              <option value="">Tutti</option>
              {corsi.map((c) => <option key={c.codice} value={c.codice}>{c.titolo}</option>)}
            </select>
          </div>
          <Button onClick={loadReport}>Applica Filtri</Button>
          <Button variant="success" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export XLS
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Ricavo Totale" value={totals.ricavo} icon={TrendingUp} color="text-success" />
        <StatCard label="Costo Totale" value={totals.costo} icon={TrendingDown} color="text-destructive" />
        <StatCard label="Margine Totale" value={totals.margine} icon={DollarSign} color="text-primary" />
      </div>

      {chartData.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Ricavo" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Costo" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Margine" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Corso</TableHead>
            <TableHead>Discenti</TableHead>
            <TableHead>Ricavo</TableHead>
            <TableHead>Costo</TableHead>
            <TableHead>Margine</TableHead>
            <TableHead>%</TableHead>
            <TableHead>Chiusura</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.map((r) => (
            <TableRow key={r.aulaId}>
              <TableCell className="font-medium">{r.corso}</TableCell>
              <TableCell>{r.discentiCount}</TableCell>
              <TableCell className="text-success">€ {r.ricavo.toFixed(2)}</TableCell>
              <TableCell className="text-destructive">€ {r.costo.toFixed(2)}</TableCell>
              <TableCell className="font-semibold">€ {r.margine.toFixed(2)}</TableCell>
              <TableCell>{r.marginePct.toFixed(1)}%</TableCell>
              <TableCell>{new Date(r.dataChiusura).toLocaleDateString("it-IT")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>€ {value.toFixed(2)}</p>
        </div>
        <div className={`h-9 w-9 rounded-lg bg-secondary flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

function ListiniTab() {
  const [listini, setListini] = useState<any[]>([]);
  const [corsi, setCorsi] = useState<any[]>([]);
  const [form, setForm] = useState({ corsoCodec: "", tipoErogazione: "AULA_FAD", costo: 0 });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const [listiniRes, corsiRes] = await Promise.all([axios.get("/api/listini"), axios.get("/api/corsi")]);
    setListini(listiniRes.data.listini || []);
    setCorsi(corsiRes.data.corsi || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await axios.post("/api/listini", form);
    setForm({ corsoCodec: "", tipoErogazione: "AULA_FAD", costo: 0 });
    load();
  };

  return (
    <div>
      <Card className="mb-6">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="flex gap-4 items-end flex-wrap">
            <div className="space-y-1.5">
              <Label>Corso</Label>
              <select
                value={form.corsoCodec}
                onChange={(e) => setForm({ ...form, corsoCodec: e.target.value })}
                className="flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm"
                required
              >
                <option value="">Seleziona corso</option>
                {corsi.map((c) => <option key={c.codice} value={c.codice}>{c.titolo}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo Erogazione</Label>
              <select
                value={form.tipoErogazione}
                onChange={(e) => setForm({ ...form, tipoErogazione: e.target.value })}
                className="flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm"
              >
                <option value="AULA_FAD">Aula/FAD</option>
                <option value="E_LEARNING">E-Learning</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Costo (€)</Label>
              <Input type="number" step="0.01" value={form.costo} onChange={(e) => setForm({ ...form, costo: parseFloat(e.target.value) })} className="w-32" required />
            </div>
            <Button type="submit" variant="success">Salva Listino</Button>
          </form>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Corso</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Costo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listini.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="font-medium">{l.corso.titolo}</TableCell>
              <TableCell>{l.tipoErogazione}</TableCell>
              <TableCell>€ {Number(l.costo).toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
