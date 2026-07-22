"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import axios from "axios";
import {
  Plus,
  X,
  Play,
  CheckCircle2,
  CalendarDays,
  Users,
  UserCog,
  FileText,
  Link2,
  Download,
  AlertCircle,
} from "lucide-react";
import { AulaCalendar } from "@/components/calendar/AulaCalendar";
import { ChiusuraAulaPanel } from "@/components/forms/ChiusuraAulaPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

type Tab = "calendario" | "discenti" | "docenti" | "modulistica" | "gcal" | "chiusura";

const STATO_VARIANT: Record<string, "warning" | "default" | "success"> = {
  PIANIFICATA: "warning",
  IN_CORSO: "default",
  CONCLUSA: "success",
};

const ALL_TABS: Array<{ key: Tab; label: string; icon: any }> = [
  { key: "calendario", label: "Calendario", icon: CalendarDays },
  { key: "discenti", label: "Discenti", icon: Users },
  { key: "docenti", label: "Docenti", icon: UserCog },
  { key: "modulistica", label: "Modulistica", icon: FileText },
  { key: "gcal", label: "Google Calendar", icon: Link2 },
  { key: "chiusura", label: "Chiusura Aula", icon: CheckCircle2 },
];

export default function AulaDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const aulaId = params.aulaId as string;

  const [aula, setAula] = useState<any>(null);
  const [tab, setTab] = useState<Tab | null>(null);
  const [loading, setLoading] = useState(true);
  const [gcalMessage, setGcalMessage] = useState("");

  useEffect(() => {
    loadAula();
    if (searchParams.get("gcal_success")) setGcalMessage("Google Calendar connesso!");
    if (searchParams.get("gcal_error")) setGcalMessage(`Errore: ${searchParams.get("gcal_error")}`);
  }, [aulaId]);

  const loadAula = async () => {
    try {
      const res = await axios.get(`/api/aule/${aulaId}`);
      setAula(res.data.aula);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAula = async () => {
    await axios.put(`/api/aule/${aulaId}`, { stato: "IN_CORSO" });
    loadAula();
  };

  const handleConcludiAula = async () => {
    await axios.put(`/api/aule/${aulaId}`, { stato: "CONCLUSA" });
    loadAula();
  };

  if (loading || !aula) return <div className="text-muted-foreground">Loading...</div>;

  const isAsincrona = aula.modalita === "FAD_ASINCRONA";
  const TABS = ALL_TABS.filter(
    (t) =>
      !(t.key === "docenti" && isAsincrona) &&
      !(t.key === "chiusura" && aula.stato !== "CONCLUSA")
  );
  const activeTab = tab ?? TABS[0].key;

  return (
    <div className="max-w-6xl">
      {gcalMessage && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-primary/10 text-primary rounded-md text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {gcalMessage}
        </div>
      )}

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{aula.corso?.titolo}</h1>
              <p className="text-muted-foreground">{aula.luogo?.nome ?? "-"}</p>
              <Badge variant={STATO_VARIANT[aula.stato]} dot className="mt-2">{aula.stato}</Badge>
            </div>
            <div className="flex gap-2">
              {aula.stato === "PIANIFICATA" && (
                <Button onClick={handleStartAula}>
                  <Play className="h-4 w-4" /> Avvia Aula
                </Button>
              )}
              {aula.stato === "IN_CORSO" && (
                <Button variant="secondary" onClick={handleConcludiAula}>
                  <CheckCircle2 className="h-4 w-4" /> Concludi Aula
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-1 mb-6 bg-secondary/60 p-1 rounded-lg w-fit flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <Button key={key} size="sm" variant={activeTab === key ? "default" : "ghost"} onClick={() => setTab(key)}>
            <Icon className="h-3.5 w-3.5" /> {label}
          </Button>
        ))}
      </div>

      {activeTab === "calendario" && <CalendarioTab aula={aula} onUpdate={loadAula} />}
      {activeTab === "discenti" && <DiscentiTab aula={aula} onUpdate={loadAula} />}
      {activeTab === "docenti" && <DocentiTab aula={aula} onUpdate={loadAula} />}
      {activeTab === "modulistica" && <ModulisticaTab aula={aula} />}
      {activeTab === "gcal" && <GCalTab aula={aula} />}
      {activeTab === "chiusura" && <ChiusuraAulaPanel aula={aula} />}
    </div>
  );
}

function CalendarioTab({ aula, onUpdate }: any) {
  if (aula.modalita === "FAD_ASINCRONA") {
    return <ScadenzaPanel aula={aula} onUpdate={onUpdate} />;
  }
  return <LezioniPanel aula={aula} onUpdate={onUpdate} />;
}

function ScadenzaPanel({ aula, onUpdate }: any) {
  const [dataFine, setDataFine] = useState(aula.dataFine ? aula.dataFine.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`/api/aule/${aula.id}`, { dataFine: dataFine || null });
      onUpdate();
    } finally {
      setSaving(false);
    }
  };

  const giorni = aula.dataFine
    ? Math.ceil((new Date(aula.dataFine).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground mb-4">
          Corso e-learning: nessuna lezione da pianificare, imposta la scadenza entro cui il discente deve completarlo.
        </p>
        <form onSubmit={handleSave} className="flex gap-4 items-end">
          <div className="space-y-1.5">
            <Label>Scadenza</Label>
            <Input type="date" value={dataFine} onChange={(e) => setDataFine(e.target.value)} />
          </div>
          <Button type="submit" variant="success" disabled={saving}>
            {saving ? "Salvataggio..." : "Salva Scadenza"}
          </Button>
        </form>

        {giorni !== null && (
          <div className={`mt-4 p-3 rounded-md text-sm ${giorni < 0 ? "bg-destructive/10 text-destructive" : giorni <= 7 ? "bg-warning/10 text-warning" : "bg-secondary/50 text-muted-foreground"}`}>
            {giorni < 0 ? `Scaduta da ${Math.abs(giorni)} giorni` : giorni === 0 ? "Scade oggi" : `Scade tra ${giorni} giorni`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LezioniPanel({ aula, onUpdate }: any) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ data: "", oraInizio: "09:00", oraFine: "13:00" });
  const [error, setError] = useState("");

  const handleAddLezione = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await axios.post(`/api/aule/${aula.id}/lezioni`, form);
      setForm({ data: "", oraInizio: "09:00", oraFine: "13:00" });
      setShowForm(false);
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.error || "Errore creazione lezione");
    }
  };

  return (
    <div>
      <div className="mb-4">
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Annulla" : "Aggiungi Lezione"}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <form onSubmit={handleAddLezione} className="flex gap-4 items-end flex-wrap">
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Ora Inizio</Label>
                <Input type="time" value={form.oraInizio} onChange={(e) => setForm({ ...form, oraInizio: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Ora Fine</Label>
                <Input type="time" value={form.oraFine} onChange={(e) => setForm({ ...form, oraFine: e.target.value })} required />
              </div>
              <Button type="submit" variant="success">Salva</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <AulaCalendar lezioni={aula.lezioni || []} />
        </CardContent>
      </Card>
    </div>
  );
}

function DiscentiTab({ aula, onUpdate }: any) {
  const bloccata = aula.stato === "CONCLUSA";
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState("");
  const [risultati, setRisultati] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const iscrittiIds = new Set((aula.iscrizioni || []).map((i: any) => i.discente.id));

  useEffect(() => {
    if (query.trim().length < 2) {
      setRisultati([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      axios
        .get(`/api/ricerca/discenti?q=${encodeURIComponent(query.trim())}`)
        .then((res) => setRisultati(res.data.discenti || []))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleAdd = async (discenteId: string) => {
    setError("");
    try {
      await axios.post(`/api/aule/${aula.id}/iscrizioni`, { discenteId });
      setQuery("");
      setRisultati([]);
      setShowAdd(false);
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.error || "Errore aggiunta discente");
    }
  };

  const handleRemove = async (discenteId: string) => {
    setError("");
    try {
      await axios.delete(`/api/aule/${aula.id}/iscrizioni?discenteId=${discenteId}`);
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.error || "Errore rimozione discente");
    }
  };

  const handleEditField = async (iscrizioneId: string, field: "cantiere" | "responsabile", value: string) => {
    try {
      await axios.patch(`/api/aule/${aula.id}/iscrizioni`, { iscrizioneId, [field]: value });
    } catch (err: any) {
      setError(err.response?.data?.error || "Errore salvataggio");
    } finally {
      onUpdate();
    }
  };

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        {(aula.iscrizioni || []).length} discenti iscritti.
      </p>

      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {bloccata ? (
        <div className="mb-4 p-3 bg-secondary/50 text-muted-foreground rounded-md text-sm">
          Aula conclusa: elenco discenti non più modificabile.
        </div>
      ) : (
        <div className="mb-4">
          <Button
            onClick={() => setShowAdd(!showAdd)}
            variant={showAdd ? "outline" : "default"}
            className="mb-3"
          >
            {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAdd ? "Annulla" : "Aggiungi Discente"}
          </Button>

          {showAdd && (
            <div className="relative max-w-md">
              <Input
                autoFocus
                placeholder="Cerca discente per nome, cognome o codice fiscale..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query.trim().length >= 2 && (
                <div className="absolute z-10 mt-1 w-full bg-card border border-input rounded-md shadow-md max-h-64 overflow-y-auto">
                  {searching && <div className="p-2 text-sm text-muted-foreground">Ricerca...</div>}
                  {!searching && risultati.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground">Nessun risultato</div>
                  )}
                  {!searching &&
                    risultati.map((d: any) => {
                      const giaIscritto = iscrittiIds.has(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          disabled={giaIscritto}
                          onClick={() => handleAdd(d.id)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/60 disabled:opacity-50 disabled:cursor-not-allowed flex justify-between items-center"
                        >
                          <span>{d.cognome} {d.nome} {d.codiceFiscale ? `(${d.codiceFiscale})` : ""}</span>
                          {giaIscritto && <span className="text-xs text-muted-foreground">già iscritto</span>}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Cantiere</TableHead>
            <TableHead>Responsabile</TableHead>
            {!bloccata && <TableHead></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {aula.iscrizioni?.map((i: any) => (
            <TableRow key={i.id}>
              <TableCell className="font-medium">{i.discente.cognome} {i.discente.nome}</TableCell>
              <TableCell>
                {bloccata ? (
                  i.cantiere || "-"
                ) : (
                  <Input
                    defaultValue={i.cantiere || ""}
                    onBlur={(e) => {
                      if (e.target.value !== (i.cantiere || "")) handleEditField(i.id, "cantiere", e.target.value);
                    }}
                    className="h-8"
                  />
                )}
              </TableCell>
              <TableCell>
                {bloccata ? (
                  i.responsabile || "-"
                ) : (
                  <Input
                    defaultValue={i.responsabile || ""}
                    onBlur={(e) => {
                      if (e.target.value !== (i.responsabile || "")) handleEditField(i.id, "responsabile", e.target.value);
                    }}
                    className="h-8"
                  />
                )}
              </TableCell>
              {!bloccata && (
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => handleRemove(i.discente.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DocentiTab({ aula, onUpdate }: any) {
  const [docenti, setDocenti] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ docenteId: "", oreEffettiveDocenza: 0, trasferAcosto: 0 });

  useEffect(() => {
    axios.get("/api/docenti").then((res) => setDocenti(res.data.docenti || []));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await axios.post(`/api/aule/${aula.id}/docenti`, form);
    setForm({ docenteId: "", oreEffettiveDocenza: 0, trasferAcosto: 0 });
    setShowAdd(false);
    onUpdate();
  };

  return (
    <div>
      <div className="mb-4">
        <Button onClick={() => setShowAdd(!showAdd)} variant={showAdd ? "outline" : "default"}>
          {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAdd ? "Annulla" : "Assegna Docente"}
        </Button>
      </div>

      {showAdd && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <form onSubmit={handleAdd} className="flex gap-4 items-end flex-wrap">
              <select
                value={form.docenteId}
                onChange={(e) => setForm({ ...form, docenteId: e.target.value })}
                className="flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm flex-1 min-w-[200px]"
                required
              >
                <option value="">Seleziona docente</option>
                {docenti.map((d) => (
                  <option key={d.id} value={d.id}>{d.cognome} {d.nome} (€{Number(d.tariffaOraria)}/h)</option>
                ))}
              </select>
              <div className="space-y-1.5">
                <Label>Ore</Label>
                <Input type="number" value={form.oreEffettiveDocenza} onChange={(e) => setForm({ ...form, oreEffettiveDocenza: parseFloat(e.target.value) })} className="w-24" required />
              </div>
              <div className="space-y-1.5">
                <Label>Trasferta €</Label>
                <Input type="number" value={form.trasferAcosto} onChange={(e) => setForm({ ...form, trasferAcosto: parseFloat(e.target.value) })} className="w-28" />
              </div>
              <Button type="submit" variant="success">Assegna</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Docente</TableHead>
            <TableHead>Ore</TableHead>
            <TableHead>Tariffa/h</TableHead>
            <TableHead>Trasferta</TableHead>
            <TableHead>Costo Totale</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {aula.docentilezioni?.map((dl: any) => (
            <TableRow key={dl.id}>
              <TableCell className="font-medium">{dl.docente.cognome} {dl.docente.nome}</TableCell>
              <TableCell className="font-data tabular-nums">{Number(dl.oreEffettiveDocenza)}</TableCell>
              <TableCell className="font-data tabular-nums">€ {Number(dl.docente.tariffaOraria)}</TableCell>
              <TableCell className="font-data tabular-nums">€ {Number(dl.trasferAcosto)}</TableCell>
              <TableCell className="font-semibold font-data tabular-nums">
                € {(Number(dl.oreEffettiveDocenza) * Number(dl.docente.tariffaOraria) + Number(dl.trasferAcosto)).toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ModulisticaTab({ aula }: any) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [archivio, setArchivio] = useState<any[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [tipoDocumento, setTipoDocumento] = useState("REGISTRO");

  useEffect(() => {
    axios.get("/api/templates").then((res) => {
      const mapped = (res.data.templates || []).filter((t: any) =>
        t.mappings?.some(
          (m: any) =>
            (m.corsoCodec === aula.corsoCodec || m.corsoCodec === null) &&
            (m.modalita === null || m.modalita === aula.modalita)
        )
      );
      setTemplates(mapped);
    });
    axios.get(`/api/aule/${aula.id}/archivio`).then((res) => setArchivio(res.data.archivio || []));
  }, [aula.id]);

  const handleGenerate = (templateId: string) => {
    window.open(`/api/aule/${aula.id}/modulistica/generate?templateId=${templateId}`, "_blank");
  };

  const handleUploadArchivio = async () => {
    if (!uploadFile) return;
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("tipoDocumento", tipoDocumento);
    await axios.post(`/api/aule/${aula.id}/archivio`, formData);
    setUploadFile(null);
    axios.get(`/api/aule/${aula.id}/archivio`).then((res) => setArchivio(res.data.archivio || []));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <p className="font-semibold text-foreground mb-3 text-sm">Genera Documenti</p>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun template mappato per questo corso.</p>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="flex justify-between items-center text-sm">
                  <span>{t.nome}</span>
                  <Button size="sm" variant="ghost" onClick={() => handleGenerate(t.id)}>
                    <Download className="h-3.5 w-3.5" /> Genera
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="font-semibold text-foreground mb-3 text-sm">Archivio Documenti</p>
          <div className="flex gap-2 mb-4">
            <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)} className="flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm">
              <option value="REGISTRO">Registro</option>
              <option value="VERBALE">Verbale</option>
              <option value="TEST">Test</option>
              <option value="ATTESTATO">Attestato</option>
            </select>
            <Input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="flex-1" />
            <Button variant="success" onClick={handleUploadArchivio} disabled={!uploadFile}>Carica</Button>
          </div>

          <div className="space-y-1">
            {archivio.map((a) => (
              <div key={a.id} className="flex justify-between items-center py-1 text-sm">
                <span>{a.tipoDocumento}</span>
                <a href={`/api/aule/${aula.id}/archivio/${a.id}/download`} className="text-primary hover:underline">
                  Scarica
                </a>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GCalTab({ aula }: any) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  const handleConnect = async () => {
    try {
      const res = await axios.get("/api/auth/google/authorize");
      window.location.href = res.data.authUrl;
    } catch (error: any) {
      alert(error.response?.data?.error || "Errore connessione Google Calendar");
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await axios.post(`/api/aule/${aula.id}/google-calendar/sync`);
      setSyncResult(res.data);
    } catch (error: any) {
      alert(error.response?.data?.error || "Errore sincronizzazione");
    } finally {
      setSyncing(false);
    }
  };

  const isAsincrona = aula.modalita === "FAD_ASINCRONA";

  return (
    <Card>
      <CardContent className="p-6">
        <p className="mb-4 text-sm text-muted-foreground">
          {isAsincrona
            ? "Sincronizza la scadenza di questa aula come promemoria su Google Calendar."
            : "Sincronizza le lezioni di questa aula con Google Calendar."}{" "}
          Richiede connessione OAuth (configurabile in Impostazioni → Google Calendar OAuth).
        </p>

        <div className="flex gap-3">
          <Button onClick={handleConnect}>
            <Link2 className="h-4 w-4" /> Connetti Google Calendar
          </Button>
          <Button variant="success" onClick={handleSync} disabled={syncing}>
            {syncing ? "Sincronizzando..." : isAsincrona ? "Sincronizza Scadenza" : "Sincronizza Lezioni"}
          </Button>
        </div>

        {syncResult && (
          <div className="mt-4 p-3 bg-secondary/50 rounded-md text-sm space-y-0.5">
            <p className="text-success">✓ Sincronizzate: {syncResult.syncedCount}</p>
            <p className="text-destructive">✗ Fallite: {syncResult.failedCount}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
