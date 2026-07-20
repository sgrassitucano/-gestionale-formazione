"use client";

import { useState } from "react";
import axios from "axios";
import { Upload, CheckCircle2, XCircle, UserPlus, Clock, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const TIPI_DOCUMENTO_PER_DISCENTE = [
  { value: "TEST", label: "Test" },
  { value: "TEST_INTERMEDI", label: "Test Intermedi" },
  { value: "TEST_FINALE", label: "Test Finale" },
  { value: "FASCICOLO", label: "Fascicolo" },
];

const TIPI_DOCUMENTO_AULA = [
  { value: "REGISTRO", label: "Registro" },
  { value: "RESOCONTO", label: "Resoconto Apprendimento" },
  { value: "GRADIMENTO", label: "Questionario Gradimento" },
  { value: "EBAFOS", label: "EBAFOS (xlsx)" },
  { value: "PIATTAFORMA", label: "Piattaforma (xlsx)" },
  { value: "LISTA_CORSISTI", label: "Lista Corsisti (xlsx)" },
  { value: "AUTODICHIARAZIONE", label: "Autodichiarazione Requisiti Tecnologici" },
  { value: "REPORT_QUESTIONARIO", label: "Report Questionario (xlsx statico)" },
];

const TIPI_ATTESTATO = [{ value: "ATTESTATO", label: "Attestato" }];

interface RigaStaging {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  tipoDocumento: string;
  discenteMatch: { discenteId: string; confidenza: number; metodo: string } | null;
  metodoLettura: "NATIVO" | "OCR" | null;
  livelloConfidenza: "ALTA" | "MEDIA" | "BASSA" | null;
  discenteIdScelto?: string | null;
  nuovoDiscente?: { nome: string; cognome: string; aziendaId: string; cantiere?: string; sottocantiere?: string } | null;
}

const BADGE_CONFIDENZA: Record<string, "success" | "warning" | "destructive"> = {
  ALTA: "success",
  MEDIA: "warning",
  BASSA: "destructive",
};

export function ChiusuraAulaPanel({ aula }: { aula: any }) {
  const [chiusura, setChiusura] = useState(aula.chiusura);
  const inCountdown = chiusura?.fase === "COUNTDOWN" || chiusura?.fase === "COMPLETATA";

  const giorniRimanenti = chiusura?.dataEliminazionePrevista
    ? Math.ceil((new Date(chiusura.dataEliminazionePrevista).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => window.open(`/api/aule/${aula.id}/chiusura/zip`, "_blank")}>
          <Download className="h-4 w-4" /> Scarica ZIP Archivio
        </Button>
      </div>

      {inCountdown && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3 bg-warning/10">
            <Clock className="h-5 w-5 text-warning shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-foreground">Countdown attivo</p>
              <p className="text-muted-foreground">
                {giorniRimanenti !== null && giorniRimanenti >= 0
                  ? `Cancellazione automatica upload temporanei tra ${giorniRimanenti} giorni.`
                  : "Cancellazione automatica in corso o completata."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <UploadStagingSection
        aula={aula}
        fase="DOCUMENTI"
        titolo="Carica Documenti — Fase 1"
        tipiPerDiscente={TIPI_DOCUMENTO_PER_DISCENTE}
        tipiAulaLevel={TIPI_DOCUMENTO_AULA}
        disabilitato={inCountdown}
        onConfermato={() => {}}
      />

      <UploadStagingSection
        aula={aula}
        fase="ATTESTATI"
        titolo="Carica Attestati — Fase 2 (avvia il countdown)"
        tipiPerDiscente={TIPI_ATTESTATO}
        tipiAulaLevel={[]}
        disabilitato={inCountdown}
        onConfermato={(res) => {
          if (res.chiusura) setChiusura(res.chiusura);
        }}
      />
    </div>
  );
}

function UploadStagingSection({
  aula,
  fase,
  titolo,
  tipiPerDiscente,
  tipiAulaLevel,
  disabilitato,
  onConfermato,
}: {
  aula: any;
  fase: "DOCUMENTI" | "ATTESTATI";
  titolo: string;
  tipiPerDiscente: { value: string; label: string }[];
  tipiAulaLevel: { value: string; label: string }[];
  disabilitato: boolean;
  onConfermato: (res: any) => void;
}) {
  const [tipoDocumento, setTipoDocumento] = useState(tipiPerDiscente[0]?.value ?? tipiAulaLevel[0]?.value);
  const [files, setFiles] = useState<FileList | null>(null);
  const [analizzando, setAnalizzando] = useState(false);
  const [staging, setStaging] = useState<RigaStaging[]>([]);
  const [confermando, setConfermando] = useState(false);
  const [confermatiCount, setConfermatiCount] = useState(0);
  const [errore, setErrore] = useState("");

  const candidati = aula.iscrizioni?.map((i: any) => i.discente) ?? [];
  const richiedeMatchDiscente = (tipo: string) => tipiPerDiscente.some((t) => t.value === tipo);

  const handleAnalizza = async () => {
    if (!files || files.length === 0) return;
    setAnalizzando(true);
    setErrore("");
    try {
      const formData = new FormData();
      formData.append("tipoDocumento", tipoDocumento);
      Array.from(files).forEach((f) => formData.append("files", f));

      const res = await axios.post(`/api/aule/${aula.id}/chiusura/analizza`, formData);
      const nuoveRighe: RigaStaging[] = res.data.risultati.map((r: any) => ({
        ...r,
        discenteIdScelto: r.discenteMatch?.discenteId ?? null,
        nuovoDiscente: null,
      }));
      setStaging((prev) => [...prev, ...nuoveRighe]);
      setFiles(null);
    } catch (err: any) {
      setErrore(err.response?.data?.error || "Errore analisi documenti");
    } finally {
      setAnalizzando(false);
    }
  };

  const aggiornaRiga = (index: number, patch: Partial<RigaStaging>) => {
    setStaging((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const tutteRigheAssegnate = staging.every(
    (r) => !richiedeMatchDiscente(r.tipoDocumento) || r.discenteIdScelto || r.nuovoDiscente
  );

  const handleConferma = async () => {
    setConfermando(true);
    setErrore("");
    try {
      const entries = staging.map((r) => ({
        fileUrl: r.fileUrl,
        mimeType: r.mimeType,
        tipoDocumento: r.tipoDocumento,
        discenteId: r.discenteIdScelto || undefined,
        nuovoDiscente: r.nuovoDiscente || undefined,
        metodoClassificazione: r.discenteIdScelto
          ? r.discenteMatch?.discenteId === r.discenteIdScelto
            ? r.discenteMatch.metodo
            : "MANUALE"
          : r.nuovoDiscente
          ? "MANUALE"
          : null,
        confidenza: r.discenteMatch?.confidenza ?? null,
      }));

      const res = await axios.post(`/api/aule/${aula.id}/chiusura/conferma`, { entries, fase });
      setConfermatiCount((prev) => prev + res.data.creati.length);
      setStaging([]);
      onConfermato(res.data);
    } catch (err: any) {
      setErrore(err.response?.data?.error || "Errore conferma documenti");
    } finally {
      setConfermando(false);
    }
  };

  if (disabilitato) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <p className="font-semibold text-foreground mb-3 text-sm">{titolo}</p>
          <div className="flex gap-2 items-end flex-wrap">
            <div className="space-y-1.5">
              <Label>Tipo documento</Label>
              <select
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
                className="flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm"
              >
                {tipiPerDiscente.length > 0 && (
                  <optgroup label="Per discente">
                    {tipiPerDiscente.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </optgroup>
                )}
                {tipiAulaLevel.length > 0 && (
                  <optgroup label="A livello aula">
                    {tipiAulaLevel.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <Label>File (uno o più)</Label>
              <Input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
            </div>
            <Button variant="success" onClick={handleAnalizza} disabled={!files || analizzando}>
              <Upload className="h-4 w-4" /> {analizzando ? "Analisi..." : "Analizza"}
            </Button>
          </div>
          {errore && <p className="text-destructive text-sm mt-2">{errore}</p>}
        </CardContent>
      </Card>

      {staging.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="font-semibold text-foreground mb-3 text-sm">
              Verifica classificazione ({staging.length} file)
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead>Discente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staging.map((r, index) => (
                  <TableRow key={r.fileUrl}>
                    <TableCell className="text-xs">{r.fileName}</TableCell>
                    <TableCell className="text-xs">{r.tipoDocumento}</TableCell>
                    <TableCell>
                      {r.livelloConfidenza && (
                        <Badge variant={BADGE_CONFIDENZA[r.livelloConfidenza]} dot>
                          {r.livelloConfidenza} ({Math.round((r.discenteMatch?.confidenza ?? 0) * 100)}%)
                        </Badge>
                      )}
                      {!richiedeMatchDiscente(r.tipoDocumento) && (
                        <span className="text-xs text-muted-foreground">n/a (documento aula)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {richiedeMatchDiscente(r.tipoDocumento) ? (
                        <RigaDiscenteSelector
                          candidati={candidati}
                          riga={r}
                          onChange={(patch) => aggiornaRiga(index, patch)}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex justify-end">
              <Button
                variant="success"
                onClick={handleConferma}
                disabled={!tutteRigheAssegnate || confermando}
              >
                <CheckCircle2 className="h-4 w-4" />
                {confermando
                  ? "Conferma in corso..."
                  : fase === "ATTESTATI"
                  ? "Conferma attestati e avvia countdown"
                  : "Conferma tutti i documenti"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {confermatiCount > 0 && (
        <p className="text-success text-sm">
          <CheckCircle2 className="h-4 w-4 inline mr-1" />
          {confermatiCount} documenti confermati e archiviati in questa sezione
        </p>
      )}
    </div>
  );
}

function RigaDiscenteSelector({
  candidati,
  riga,
  onChange,
}: {
  candidati: any[];
  riga: RigaStaging;
  onChange: (patch: Partial<RigaStaging>) => void;
}) {
  const [modalitaNuovo, setModalitaNuovo] = useState(false);
  const [nuovo, setNuovo] = useState({ nome: "", cognome: "", cantiere: "", sottocantiere: "" });

  if (modalitaNuovo) {
    return (
      <div className="flex flex-col gap-1 min-w-[220px]">
        <div className="flex gap-1">
          <Input placeholder="Nome" value={nuovo.nome} onChange={(e) => setNuovo({ ...nuovo, nome: e.target.value })} className="h-8 text-xs" />
          <Input placeholder="Cognome" value={nuovo.cognome} onChange={(e) => setNuovo({ ...nuovo, cognome: e.target.value })} className="h-8 text-xs" />
        </div>
        <div className="flex gap-1">
          <Input placeholder="Cantiere (opz.)" value={nuovo.cantiere} onChange={(e) => setNuovo({ ...nuovo, cantiere: e.target.value })} className="h-8 text-xs" />
          <Input placeholder="Sottocantiere (opz.)" value={nuovo.sottocantiere} onChange={(e) => setNuovo({ ...nuovo, sottocantiere: e.target.value })} className="h-8 text-xs" />
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="success"
            disabled={!nuovo.nome || !nuovo.cognome}
            onClick={() => {
              const aziendaId = candidati[0]?.aziendaId;
              onChange({
                discenteIdScelto: null,
                nuovoDiscente: { ...nuovo, aziendaId },
              });
            }}
          >
            Salva
          </Button>
          <Button size="sm" variant="outline" onClick={() => setModalitaNuovo(false)}>
            Annulla
          </Button>
        </div>
      </div>
    );
  }

  if (riga.nuovoDiscente) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Badge variant="warning">Nuovo: {riga.nuovoDiscente.cognome} {riga.nuovoDiscente.nome}</Badge>
        <Button size="sm" variant="ghost" onClick={() => onChange({ nuovoDiscente: null })}>
          <XCircle className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={riga.discenteIdScelto ?? ""}
        onChange={(e) => onChange({ discenteIdScelto: e.target.value || null })}
        className="flex h-8 rounded-md border border-input bg-card px-2 py-1 text-xs min-w-[160px]"
      >
        <option value="">-- seleziona --</option>
        {candidati.map((c) => (
          <option key={c.id} value={c.id}>{c.cognome} {c.nome}</option>
        ))}
      </select>
      <Button size="sm" variant="ghost" onClick={() => setModalitaNuovo(true)}>
        <UserPlus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
