"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Upload, Info, School, Pencil, Trash2, Check, X, Save, ListChecks, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const TIPO_GENERAZIONE_OPTIONS = [
  { value: "PER_AULA_SEMPLICE", label: "Per Aula (semplice)" },
  { value: "PER_AULA_LISTA", label: "Per Aula (con tabella discenti)" },
  { value: "PER_DISCENTE", label: "Per Discente (uno a testa)" },
  { value: "STATICO", label: "Statico (scarica così com'è)" },
];

const SORGENTI_DATI = [
  { value: "discente.nome", label: "Discente: Nome" },
  { value: "discente.cognome", label: "Discente: Cognome" },
  { value: "discente.codiceFiscale", label: "Discente: Codice Fiscale" },
  { value: "discente.dataNascita", label: "Discente: Data Nascita" },
  { value: "corso.titolo", label: "Corso: Titolo" },
  { value: "corso.codice", label: "Corso: Codice" },
  { value: "aula.luogo.nome", label: "Aula: Luogo" },
  { value: "aula.dataInizio", label: "Aula: Data Inizio" },
  { value: "aula.dataFine", label: "Aula: Data Fine" },
  { value: "docente.nome", label: "Docente: Nome" },
  { value: "docente.cognome", label: "Docente: Cognome" },
  { value: "system.dataOggi", label: "Sistema: Data Odierna" },
];

export default function Modulo4Page() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [nome, setNome] = useState("");
  const [tipoGenerazione, setTipoGenerazione] = useState("PER_AULA_SEMPLICE");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [extractedFields, setExtractedFields] = useState<any[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [savingMappings, setSavingMappings] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await axios.get("/api/templates");
      setTemplates(res.data.templates || []);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !nome) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("nome", nome);
      formData.append("tipoGenerazione", tipoGenerazione);

      const res = await axios.post("/api/templates", formData);
      setExtractedFields(res.data.extractedFields || []);
      setSelectedTemplate(res.data.template);
      setFieldMappings({});
      setFile(null);
      setNome("");
      setTipoGenerazione("PER_AULA_SEMPLICE");
      loadTemplates();
    } catch (error: any) {
      alert(error.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveMappings = async () => {
    if (!selectedTemplate) return;
    setSavingMappings(true);
    try {
      for (const field of extractedFields) {
        const sorgenteDato = fieldMappings[field.nomeCampo];
        if (sorgenteDato) {
          await axios.put(`/api/templates/${selectedTemplate.id}/campi`, {
            nomeCampo: field.nomeCampo,
            sorgenteDato,
          });
        }
      }
      loadTemplates();
    } finally {
      setSavingMappings(false);
    }
  };

  const handleChangeTipo = async (templateId: string, tipo: string) => {
    await axios.put(`/api/templates/${templateId}`, { tipoGenerazione: tipo });
    loadTemplates();
  };

  const startRename = (t: any) => {
    setEditingId(t.id);
    setEditName(t.nome);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditName("");
  };

  const saveRename = async (templateId: string) => {
    if (!editName.trim()) return;
    await axios.put(`/api/templates/${templateId}`, { nome: editName.trim() });
    setEditingId(null);
    setEditName("");
    loadTemplates();
  };

  const startEditFields = (t: any) => {
    setSelectedTemplate(t);
    setExtractedFields((t.campi || []).map((c: any) => ({ nomeCampo: c.nomeCampo, placeholder: c.placeholder })));
    setFieldMappings(
      Object.fromEntries((t.campi || []).map((c: any) => [c.nomeCampo, c.sorgenteDato || ""]))
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePreview = async (t: any) => {
    setPreviewLoading(t.id);
    try {
      if (t.mimeType.includes("wordprocessingml")) {
        const res = await axios.get(`/api/templates/${t.id}/preview`, { responseType: "blob" });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement("a");
        a.href = url;
        a.download = `anteprima_${t.nome}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const res = await axios.get(`/api/templates/${t.id}/preview`);
        setPreviewHtml(res.data.html);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || "Anteprima non disponibile");
    } finally {
      setPreviewLoading(null);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Eliminare questo template?")) return;
    await axios.delete(`/api/templates/${templateId}`);
    if (selectedTemplate?.id === templateId) {
      setSelectedTemplate(null);
      setExtractedFields([]);
    }
    loadTemplates();
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold text-foreground mb-1">Modulistica</h1>
      <p className="text-sm text-muted-foreground mb-6">Template dinamici e generazione documenti</p>

      <Card className="mb-6">
        <CardContent className="p-6">
          <p className="font-semibold text-foreground mb-2">Carica Template</p>
          <div className="flex items-start gap-2 mb-4 p-3 bg-primary/5 rounded-md text-sm text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
            <span>
              Carica PDF, DOCX o HTML. Usa placeholder <code className="bg-secondary px-1.5 py-0.5 rounded text-xs font-mono">{"{{nome_campo}}"}</code> nel documento — il sistema li rileva automaticamente.
            </span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome Template</Label>
              <Input placeholder="es. Foglio Firme" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>File</Label>
              <Input type="file" accept=".pdf,.docx,.doc,.html,.xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo Generazione</Label>
              <select value={tipoGenerazione} onChange={(e) => setTipoGenerazione(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm">
                {TIPO_GENERAZIONE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <Button onClick={handleUpload} disabled={!file || !nome || uploading} className="w-full">
              <Upload className="h-4 w-4" />
              {uploading ? "Caricamento..." : "Carica Template"}
            </Button>
          </div>

          {selectedTemplate && (
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-foreground text-sm">
                  Campi di "{selectedTemplate.nome}" ({extractedFields.length}) — Associa ogni campo a un dato:
                </p>
                <Button size="sm" variant="ghost" onClick={() => { setSelectedTemplate(null); setExtractedFields([]); setFieldMappings({}); }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              {extractedFields.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nessun campo rilevato in questo template. Aggiungi placeholder <code className="bg-secondary px-1.5 py-0.5 rounded text-xs font-mono">{"{{nome_campo}}"}</code> nel documento e ricaricalo.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    {extractedFields.map((field: any) => (
                      <div key={field.nomeCampo} className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-secondary px-2 py-1.5 rounded w-1/3 truncate">
                          {field.placeholder}
                        </span>
                        <select
                          value={fieldMappings[field.nomeCampo] ?? ""}
                          onChange={(e) => setFieldMappings({ ...fieldMappings, [field.nomeCampo]: e.target.value })}
                          className="flex-1 h-9 rounded-md border border-input bg-card px-2 text-sm"
                        >
                          <option value="">-- seleziona dato --</option>
                          {SORGENTI_DATI.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleSaveMappings} disabled={savingMappings} variant="success" className="mt-3 w-full">
                    <Save className="h-4 w-4" />
                    {savingMappings ? "Salvataggio..." : "Salva Mappature"}
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Formato</TableHead>
            <TableHead>Generazione</TableHead>
            <TableHead>Campi</TableHead>
            <TableHead>Corsi Mappati</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">
                {editingId === t.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8"
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" onClick={() => saveRename(t.id)}>
                      <Check className="h-3.5 w-3.5 text-success" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelRename}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  t.nome
                )}
              </TableCell>
              <TableCell><Badge variant="secondary">{t.mimeType.split("/").pop()}</Badge></TableCell>
              <TableCell>
                <select
                  value={t.tipoGenerazione}
                  onChange={(e) => handleChangeTipo(t.id, e.target.value)}
                  className="h-8 rounded-md border border-input bg-card px-2 text-xs"
                >
                  {TIPO_GENERAZIONE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </TableCell>
              <TableCell className="font-data tabular-nums">{t.campi?.length || 0} campi</TableCell>
              <TableCell className="font-data tabular-nums">{t.mappings?.length || 0} corsi</TableCell>
              <TableCell>
                {editingId !== t.id && (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handlePreview(t)} disabled={previewLoading === t.id} title="Anteprima">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => startEditFields(t)} title="Modifica Campi">
                      <ListChecks className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => startRename(t)} title="Rinomina">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteTemplate(t.id)} className="text-destructive hover:bg-destructive/10" title="Elimina">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Card className="mt-6 bg-secondary/40">
        <CardContent className="p-4 flex items-start gap-2 text-sm">
          <School className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
          <span className="text-muted-foreground">
            Il mapping Template↔Corso↔Modalità si gestisce in Aule → Anagrafica Corsi.
            La generazione documenti avviene dal dettaglio Aula → tab "Modulistica".
          </span>
        </CardContent>
      </Card>

      {previewHtml !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onClick={() => setPreviewHtml(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <p className="font-semibold text-foreground text-sm">Anteprima (dati di esempio)</p>
              <Button size="sm" variant="ghost" onClick={() => setPreviewHtml(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-auto p-6" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      )}
    </div>
  );
}
