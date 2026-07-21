"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { DatabaseBackup, Download, Upload, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Stato {
  ultimoBackup: { data: string; utente: string; righeTotali: number; dimensioneByte: number } | null;
  giorniTrascorsi: number | null;
  scaduto: boolean;
  sogliaGiorni: number;
}

export default function BackupPage() {
  const [stato, setStato] = useState<Stato | null>(null);
  const [loading, setLoading] = useState(true);
  const [esportando, setEsportando] = useState(false);
  const [ripristinando, setRipristinando] = useState(false);
  const [esitoRipristino, setEsitoRipristino] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const caricaStato = () => {
    setLoading(true);
    axios
      .get("/api/admin/backup")
      .then((res) => setStato(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    caricaStato();
  }, []);

  const scaricaBackup = async () => {
    setEsportando(true);
    try {
      const res = await axios.get("/api/admin/backup/export", { responseType: "blob" });
      const disposition = res.headers["content-disposition"] || "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match ? match[1] : "backup.tucanobackup";

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      caricaStato();
    } catch (err) {
      alert("Errore durante l'export del backup.");
    } finally {
      setEsportando(false);
    }
  };

  const ripristinaBackup = async (file: File) => {
    if (
      !confirm(
        "Ripristinare i dati da questo file di backup?\n\nQuesta operazione crea solo le righe MANCANTI — non sovrascrive né cancella mai righe già esistenti con lo stesso ID."
      )
    ) {
      return;
    }

    setRipristinando(true);
    setEsitoRipristino(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post("/api/admin/backup/import", formData);
      setEsitoRipristino(res.data);
      caricaStato();
    } catch (err: any) {
      alert(err.response?.data?.error || "Errore durante il ripristino.");
    } finally {
      setRipristinando(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground mb-1">Backup Dati</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Esporta/ripristina una copia cifrata di tutti i dati del sistema.
      </p>

      {stato?.scaduto && (
        <Card className="mb-4 border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">
                {stato.ultimoBackup
                  ? `Nessun backup da ${stato.giorniTrascorsi} giorni (soglia: ${stato.sogliaGiorni} giorni).`
                  : "Nessun backup è mai stato effettuato."}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Scarica un backup ora per avere una copia aggiornata.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <DatabaseBackup className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Ultimo backup</h2>
          </div>
          {stato?.ultimoBackup ? (
            <div className="text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Data:</span>{" "}
                {new Date(stato.ultimoBackup.data).toLocaleString("it-IT")}
              </p>
              <p>
                <span className="text-muted-foreground">Effettuato da:</span> {stato.ultimoBackup.utente}
              </p>
              <p className="font-data tabular-nums">
                <span className="text-muted-foreground">Righe:</span> {stato.ultimoBackup.righeTotali} ·{" "}
                <span className="text-muted-foreground">Dimensione:</span>{" "}
                {(stato.ultimoBackup.dimensioneByte / 1024).toFixed(0)} KB
              </p>
              {!stato.scaduto && <Badge dot variant="success">Aggiornato</Badge>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nessun backup ancora effettuato.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <Download className="h-4 w-4" /> Scarica backup
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Esporta tutti i dati in un file cifrato (.tucanobackup), da conservare fuori dal sistema.
            </p>
            <Button onClick={scaricaBackup} disabled={esportando}>
              {esportando ? "Esportazione in corso..." : "Scarica ora"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <Upload className="h-4 w-4" /> Ripristina da backup
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Carica un file .tucanobackup precedentemente scaricato. Crea solo le righe mancanti — non sovrascrive né cancella nulla di esistente.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".tucanobackup"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && ripristinaBackup(e.target.files[0])}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={ripristinando}
            >
              {ripristinando ? "Ripristino in corso..." : "Scegli file..."}
            </Button>
          </CardContent>
        </Card>
      </div>

      {esitoRipristino && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-2">
              Ripristino completato — {esitoRipristino.righeTotali} righe processate
            </p>
            <div className="text-xs text-muted-foreground space-y-0.5 font-data tabular-nums">
              {Object.entries(esitoRipristino.risultati || {}).map(([modello, r]: [string, any]) => (
                <p key={modello}>
                  {modello}: {r.creati} creati, {r.saltati} già presenti{r.errori > 0 ? `, ${r.errori} errori` : ""}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
