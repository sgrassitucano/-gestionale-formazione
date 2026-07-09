"use client";

import { useEffect, useState } from "react";
import axios from "axios";

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
    } catch (error) {
      console.error(error);
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
    try {
      await axios.put(`/api/templates/${templateId}/campi`, { nomeCampo, sorgenteDato });
      loadTemplates();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Modulo 4: Modulistica</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Carica Template</h2>
        <p className="text-sm text-gray-600 mb-4">
          Carica PDF, DOCX o HTML. Usa placeholder <code className="bg-gray-100 px-1 rounded">{"{{nome_campo}}"}</code> nel documento — il sistema li rileva automaticamente.
        </p>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Nome template (es. Foglio Firme)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
          <input
            type="file"
            accept=".pdf,.docx,.doc,.html"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full border px-3 py-2 rounded"
          />
          <button
            onClick={handleUpload}
            disabled={!file || !nome || uploading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? "Caricamento..." : "Carica Template"}
          </button>
        </div>

        {extractedFields.length > 0 && selectedTemplate && (
          <div className="mt-6 border-t pt-4">
            <p className="font-semibold mb-2">
              Campi rilevati ({extractedFields.length}) — Associa ogni campo a un dato:
            </p>
            <div className="space-y-2">
              {extractedFields.map((field: any) => (
                <div key={field.nomeCampo} className="flex items-center gap-2">
                  <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded w-1/3">
                    {field.placeholder}
                  </span>
                  <select
                    onChange={(e) =>
                      handleFieldMapping(selectedTemplate.id, field.nomeCampo, e.target.value)
                    }
                    className="flex-1 border px-2 py-1 rounded text-sm"
                    defaultValue=""
                  >
                    <option value="">-- seleziona dato --</option>
                    {SORGENTI_DATI.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Nome</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Tipo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Campi</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Corsi Mappati</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-3 text-sm">{t.nome}</td>
                <td className="px-6 py-3 text-sm">{t.mimeType.split("/").pop()}</td>
                <td className="px-6 py-3 text-sm">{t.campi?.length || 0} campi</td>
                <td className="px-6 py-3 text-sm">{t.mappings?.length || 0} corsi</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-gray-50 rounded-lg p-6 border">
        <p className="font-semibold mb-2">Archivio & Generazione PDF</p>
        <p className="text-sm text-gray-600">
          Vai in un'Aula (Modulo 3) → tab "Modulistica" per generare documenti pre-compilati
          e caricare registri/verbali/attestati.
        </p>
      </div>
    </div>
  );
}
