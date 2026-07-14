"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Receipt, Users2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const MODALITA_LABELS: Record<string, string> = {
  PRESENZA: "Presenza",
  FAD_SINCRONA: "FAD Sincrona",
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function Modulo5Page() {
  const [mese, setMese] = useState(currentMonth());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [mese]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/reports/da-fatturare", { params: { mese } });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  const totaleImporto =
    (data?.singole?.reduce((sum: number, s: any) => sum + s.importoDaFatturare, 0) || 0) +
    (data?.aggregato?.importoDaFatturare || 0);

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-foreground mb-1">Prefatturazione</h1>
      <p className="text-sm text-muted-foreground mb-6">Cosa fatturare questo mese, per aula (data aula)</p>

      <Card className="mb-6">
        <CardContent className="p-4 flex items-end gap-4">
          <div className="space-y-1.5">
            <Label>Mese</Label>
            <Input type="month" value={mese} onChange={(e) => setMese(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {loading || !data ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : (
        <>
          <Card className="mb-6">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Totale da Fatturare</p>
                <p className="text-3xl font-bold text-primary">€ {totaleImporto.toFixed(2)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Receipt className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <h2 className="text-lg font-semibold text-foreground mb-2">Presenza / FAD Sincrona</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Corso</TableHead>
                <TableHead>Modalità</TableHead>
                <TableHead>Luogo</TableHead>
                <TableHead>Discenti</TableHead>
                <TableHead>Da Fatturare</TableHead>
                <TableHead>Costo Atteso (docenti+affitto)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.singole.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nessuna aula da fatturare questo mese.</TableCell></TableRow>
              )}
              {data.singole.map((s: any) => (
                <TableRow key={s.aulaId}>
                  <TableCell className="font-medium">{s.corso}</TableCell>
                  <TableCell><Badge variant="secondary">{MODALITA_LABELS[s.modalita]}</Badge></TableCell>
                  <TableCell>{s.luogo}</TableCell>
                  <TableCell>{s.discentiCount}</TableCell>
                  <TableCell className="font-semibold text-success">€ {s.importoDaFatturare.toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    docenti € {s.costoAtteso.docenti.toFixed(2)} + affitto € {s.costoAtteso.affitto.toFixed(2)} = € {s.costoAtteso.totale.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <h2 className="text-lg font-semibold text-foreground mt-8 mb-2">FAD Asincrona (aggregata)</h2>
          <Card className="mb-4">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                <Users2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {data.aggregato.aule.length} aule · {data.aggregato.totalDiscenti} corsisti totali
                </p>
                <p className="text-xl font-bold text-success">€ {data.aggregato.importoDaFatturare.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          {data.aggregato.aule.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Corso</TableHead>
                  <TableHead>Discenti</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.aggregato.aule.map((a: any) => (
                  <TableRow key={a.aulaId}>
                    <TableCell className="font-medium">{a.corso}</TableCell>
                    <TableCell>{a.discentiCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </div>
  );
}
