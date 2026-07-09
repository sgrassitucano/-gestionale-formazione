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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

type Tab = "calendario" | "discenti" | "docenti" | "modulistica" | "gcal";

const STATO_VARIANT: Record<string, "warning" | "default" | "success"> = {
  PIANIFICATA: "warning",
  IN_CORSO: "default",
  CONCLUSA: "success",
};

const TABS: Array<{ key: Tab; label: string; icon: any }> = [
  { key: "calendario", label: "Calendario", icon: CalendarDays },
  { key: "discenti", label: "Discenti", icon: Users },
  { key: "docenti", label: "Docenti", icon: UserCog },
  { key: "modulistica", label: "Modulistica", icon: FileText },
  { key: "gcal", label: "Google Calendar", icon: Link2 },
];

export default function AulaDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const aulaId = params.aulaId as string;

  const [aula, setAula] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("calendario");
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

  const handleCloseAula = async () => {
    if (!confirm("Chiudere l'aula? Verrà generato il bilancio finale (irreversibile).")) return;
    try {
      const res = await axios.post(`/api/aule/${aulaId}/close`);
      alert(`Aula chiusa! Margine: € ${res.data.bilancio.margine.toFixed(2)}`);
      loadAula();
    } catch (error: any) {
      alert(error.response?.data?.error || "Errore chiusura aula");
    }
  };

  const handleStartAula = async () => {
    await axios.put(`/api/aule/${aulaId}`, { stato: "IN_CORSO" });
    loadAula();
  };

  if (loading || !aula) return <div className="text-muted-foreground">Loading...</div>;

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
              <p className="text-muted-foreground">{aula.luogo}</p>
              <Badge variant={STATO_VARIANT[aula.stato]} className="mt-2">{aula.stato}</Badge>
            </div>
            <div className="flex gap-2">
              {aula.stato === "PIANIFICATA" && (
                <Button onClick={handleStartAula}>
                  <Play className="h-4 w-4" /> Avvia Aula
                </Button>
              )}
              {aula.stato === "IN_CORSO" && !aula.bilancioSnapshot && (
                <Button variant="destructive" onClick={handleCloseAula}>
                  <CheckCircle2 className="h-4 w-4" /> Chiudi Aula
                </Button>
              )}
            </div>
          </div>

          {aula.bilancioSnapshot && (
            <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Ricavo</p>
                <p className="font-bold text-success">€ {Number(aula.bilancioSnapshot.ricavo).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Costo</p>
                <p className="font-bold text-destructive">€ {Number(aula.bilancioSnapshot.costoTotale).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Margine</p>
                <p className="font-bold text-primary">€ {Number(aula.bilancioSnapshot.margine).toFixed(2)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-1 mb-6 bg-secondary/60 p-1 rounded-lg w-fit flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <Button key={key} size="sm" variant={tab === key ? "default" : "ghost"} onClick={() => setTab(key)}>
            <Icon className="h-3.5 w-3.5" /> {label}
          </Button>
        ))}
      </div>

      {tab === "calendario" && <CalendarioTab aula={aula} onUpdate={loadAula} />}
      {tab === "discenti" && <DiscentiTab aula={aula} onUpdate={loadAula} />}
      {tab === "docenti" && <DocentiTab aula={aula} onUpdate={loadAula} />}
      {tab === "modulistica" && <ModulisticaTab aula={aula} />}
      {tab === "gcal" && <GCalTab aula={aula} />}
    </div>
  );
}

function CalendarioTab({ aula, onUpdate }: any) {
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
  const [esigenze, setEsigenze] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (showAdd) {
      axios.get("/api/discenti/esigenze").then((res) => setEsigenze(res.data.discenti || []));
    }
  }, [showAdd]);

  const handleAdd = async (discenteId: string) => {
    await axios.post(`/api/aule/${aula.id}/iscrizioni`, { discenteId });
    onUpdate();
    setShowAdd(false);
  };

  return (
    <div>
      <div className="mb-4">
        <Button onClick={() => setShowAdd(!showAdd)} variant={showAdd ? "outline" : "default"}>
          {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAdd ? "Annulla" : "Aggiungi Discente"}
        </Button>
      </div>

      {showAdd && (
        <Card className="mb-4 max-h-60 overflow-y-auto">
          <CardContent className="p-4">
            <p className="font-semibold text-foreground mb-2 text-sm">Esigenze Pendenti ({esigenze.length})</p>
            {esigenze.map((d) => (
              <div key={d.id} className="flex justify-between items-center py-2 border-t border-border text-sm">
                <span>{d.cognome} {d.nome} — {d.azienda?.ragioneSociale}</span>
                <Button size="sm" variant="ghost" onClick={() => handleAdd(d.id)}>Aggiungi</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Cantiere</TableHead>
            <TableHead>Responsabile</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {aula.iscrizioni?.map((i: any) => (
            <TableRow key={i.id}>
              <TableCell className="font-medium">{i.discente.cognome} {i.discente.nome}</TableCell>
              <TableCell>{i.cantiere || "-"}</TableCell>
              <TableCell>{i.responsabile || "-"}</TableCell>
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
              <TableCell>{Number(dl.oreEffettiveDocenza)}</TableCell>
              <TableCell>€ {Number(dl.docente.tariffaOraria)}</TableCell>
              <TableCell>€ {Number(dl.trasferAcosto)}</TableCell>
              <TableCell className="font-semibold">
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
        t.mappings?.some((m: any) => m.corsoCodec === aula.corsoCodec)
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
                <a href={a.fileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
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

  return (
    <Card>
      <CardContent className="p-6">
        <p className="mb-4 text-sm text-muted-foreground">
          Sincronizza le lezioni di questa aula con Google Calendar. Richiede connessione OAuth
          (configurabile in Impostazioni → Google Calendar OAuth).
        </p>

        <div className="flex gap-3">
          <Button onClick={handleConnect}>
            <Link2 className="h-4 w-4" /> Connetti Google Calendar
          </Button>
          <Button variant="success" onClick={handleSync} disabled={syncing}>
            {syncing ? "Sincronizzando..." : "Sincronizza Lezioni"}
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
