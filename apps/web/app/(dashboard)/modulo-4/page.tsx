"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Upload, Info, School } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const SORGENTI_DATI = [
  { value: "discente.nome", label: "Discente: Nome" },
  { value: "discente.cognome", label: "Discente: Cognome" },
  { value: "discente.codiceFiscale", label: "Discente: Codice Fiscale" },
  { value: "discente.dataNascita", label: "Discente: Data Nascita" },
  { value: "corso.titolo", label: "Corso: Titolo" },
  { value: "corso.codice", label: "Corso: Codice" },
  { value: "aula.luogo", label: "Aula: Luogo" },
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
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [extractedFields, setExtractedFields] = useState<any[]>([]);

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

      const res = await axios.post("/api/templates", formData);
      setExtractedFields(res.data.extractedFields || []);
      setSelectedTemplate(res.data.template);
      setFile(null);
      setNome("");
      loadTemplates();
    } catch (error: any) {
      alert(error.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFieldMapping = async (templateId: string, nomeCampo: string, sorgenteDato: string) => {
    await axios.put(`/api/templates/${templateId}/campi`, { nomeCampo, sorgenteDato });
    loadTemplates();
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-4xl">
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
              <Input type="file" accept=".pdf,.docx,.doc,.html" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <Button onClick={handleUpload} disabled={!file || !nome || uploading} className="w-full">
              <Upload className="h-4 w-4" />
              {uploading ? "Caricamento..." : "Carica Template"}
            </Button>
          </div>

          {extractedFields.length > 0 && selectedTemplate && (
            <div className="mt-6 pt-4 border-t border-border">
              <p className="font-semibold text-foreground mb-2 text-sm">
                Campi rilevati ({extractedFields.length}) — Associa ogni campo a un dato:
              </p>
              <div className="space-y-2">
                {extractedFields.map((field: any) => (
                  <div key={field.nomeCampo} className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-secondary px-2 py-1.5 rounded w-1/3 truncate">
                      {field.placeholder}
                    </span>
                    <select
                      onChange={(e) => handleFieldMapping(selectedTemplate.id, field.nomeCampo, e.target.value)}
                      className="flex-1 h-9 rounded-md border border-input bg-card px-2 text-sm"
                      defaultValue=""
                    >
                      <option value="">-- seleziona dato --</option>
                      {SORGENTI_DATI.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Campi</TableHead>
            <TableHead>Corsi Mappati</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.nome}</TableCell>
              <TableCell><Badge variant="secondary">{t.mimeType.split("/").pop()}</Badge></TableCell>
              <TableCell>{t.campi?.length || 0} campi</TableCell>
              <TableCell>{t.mappings?.length || 0} corsi</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Card className="mt-6 bg-secondary/40">
        <CardContent className="p-4 flex items-start gap-2 text-sm">
          <School className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
          <span className="text-muted-foreground">
            Vai in un'Aula (Modulo 3) → tab "Modulistica" per generare documenti pre-compilati
            e caricare registri/verbali/attestati.
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
