"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Download, ChevronDown, ChevronUp, Landmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function Modulo7Page() {
  const [mese, setMese] = useState(currentMonth());
  const [drillDown, setDrillDown] = useState<any[]>([]);
  const [expandedCantiere, setExpandedCantiere] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCentriCosto();
  }, [mese]);

  const loadCentriCosto = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/reports/centri-costo", { params: { mese } });
      setDrillDown(res.data.drillDown || []);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams({ mese, format: "xlsx" });
    window.open(`/api/reports/centri-costo?${params.toString()}`, "_blank");
  };

  const totale = drillDown.reduce((sum, c) => sum + c.totale, 0);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-foreground mb-1">Centri di Costo</h1>
      <p className="text-sm text-muted-foreground mb-6">Distribuzione costi per cantiere, aggregata per mese</p>

      <Card className="mb-6">
        <CardContent className="p-4 flex gap-4 items-end">
          <div className="space-y-1.5">
            <Label>Mese</Label>
            <Input type="month" value={mese} onChange={(e) => setMese(e.target.value)} />
          </div>
          <Button variant="success" onClick={handleExport}><Download className="h-4 w-4" /> Export XLS</Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Totale Costi Distribuiti</p>
            <p className="text-3xl font-bold text-primary">€ {totale.toFixed(2)}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Landmark className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : drillDown.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            Nessun dato disponibile per questo mese.
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cantiere</TableHead>
              <TableHead>Costo Totale</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drillDown.map((c) => (
              <>
                <TableRow
                  key={c.cantiere}
                  className="cursor-pointer"
                  onClick={() => setExpandedCantiere(expandedCantiere === c.cantiere ? null : c.cantiere)}
                >
                  <TableCell className="font-semibold">{c.cantiere}</TableCell>
                  <TableCell>€ {c.totale.toFixed(2)}</TableCell>
                  <TableCell className="text-primary flex items-center gap-1 text-sm">
                    {expandedCantiere === c.cantiere ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Dettaglio
                  </TableCell>
                </TableRow>
                {expandedCantiere === c.cantiere &&
                  c.sottocantieri.map((sub: any) => (
                    <TableRow key={`${c.cantiere}-${sub.nome}`} className="bg-secondary/30">
                      <TableCell className="pl-10 text-muted-foreground text-sm">
                        {sub.nome} {sub.responsabile ? `(Resp: ${sub.responsabile})` : ""}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">€ {sub.totale.toFixed(2)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))}
              </>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
