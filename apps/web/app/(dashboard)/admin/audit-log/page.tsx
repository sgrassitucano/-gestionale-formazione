"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/audit/logs").then((res) => setLogs(res.data.logs || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-foreground mb-1">Audit Log</h1>
      <p className="text-sm text-muted-foreground mb-6">Storico azioni utenti sul sistema</p>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="p-6 flex items-center gap-2 text-muted-foreground text-sm">
            <ScrollText className="h-4 w-4" /> Nessuna azione registrata.
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Utente</TableHead>
              <TableHead>Azione</TableHead>
              <TableHead>Tabella</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log: any) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString("it-IT")}
                </TableCell>
                <TableCell className="text-sm">{log.utente?.email || log.utenteId}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{log.azione}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{log.tabella || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
