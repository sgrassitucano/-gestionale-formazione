"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ChevronLeft, ChevronRight, Upload, Check, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MODALITA_OPTIONS = [
  { value: "PRESENZA", label: "Presenza" },
  { value: "FAD_SINCRONA", label: "FAD Sincrona" },
  { value: "FAD_ASINCRONA", label: "FAD Asincrona" },
];

const STEPS = ["Tipo Aula", "Discenti", "Dati Aula"];

export default function NuovaAulaPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [corsi, setCorsi] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [docenti, setDocenti] = useState<any[]>([]);
  const [luoghi, setLuoghi] = useState<any[]>([]);
  const [nuovoLuogo, setNuovoLuogo] = useState("");
  const [showNuovoLuogo, setShowNuovoLuogo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [corsoCodec, setCorsoCodec] = useState("");
  const [modalita, setModalita] = useState("PRESENZA");

  // Step 2
  const [file, setFile] = useState<File | null>(null);

  // Step 3
  const [luogoId, setLuogoId] = useState("");
  const [dataInizio, setDataInizio] = useState("");
  const [costoAffitto, setCostoAffitto] = useState(0);
  const [docentiAssegnati, setDocentiAssegnati] = useState<Array<{ docenteId: string; oreEffettiveDocenza: number; trasferAcosto: number }>>([]);

  useEffect(() => {
    axios.get("/api/corsi").then((res) => setCorsi(res.data.corsi || []));
    axios.get("/api/templates").then((res) => setTemplates(res.data.templates || []));
    axios.get("/api/docenti").then((res) => setDocenti(res.data.docenti || []));
    loadLuoghi();
  }, []);

  const loadLuoghi = async () => {
    const res = await axios.get("/api/luoghi");
    setLuoghi(res.data.luoghi || []);
  };

  const handleCreaLuogo = async () => {
    if (!nuovoLuogo.trim()) return;
    const res = await axios.post("/api/luoghi", { nome: nuovoLuogo.trim() });
    setNuovoLuogo("");
    setShowNuovoLuogo(false);
    await loadLuoghi();
    setLuogoId(res.data.luogo.id);
  };

  const addDocente = () => {
    setDocentiAssegnati([
      ...docentiAssegnati,
      { docenteId: "", oreEffettiveDocenza: corsoSelezionato?.oreAula ?? 0, trasferAcosto: 0 },
    ]);
  };

  const updateDocente = (idx: number, field: string, value: any) => {
    const updated = [...docentiAssegnati];
    updated[idx] = { ...updated[idx], [field]: value };
    setDocentiAssegnati(updated);
  };

  const removeDocente = (idx: number) => {
    setDocentiAssegnati(docentiAssegnati.filter((_, i) => i !== idx));
  };

  const corsoSelezionato = corsi.find((c) => c.codice === corsoCodec);
  const hasMappedTemplate = (codiceCorso: string, mod: string) =>
    templates.some((t: any) =>
      t.mappings?.some(
        (m: any) =>
          (m.corsoCodec === codiceCorso || m.corsoCodec === null) &&
          (m.modalita === null || m.modalita === mod)
      )
    );
  const corsiFiltrati = corsi.filter(
    (c) =>
      (!c.modalitaConsentite?.length || c.modalitaConsentite.includes(modalita)) &&
      hasMappedTemplate(c.codice, modalita)
  );

  useEffect(() => {
    if (corsoSelezionato && !corsiFiltrati.some((c) => c.codice === corsoCodec)) {
      setCorsoCodec("");
    }
  }, [modalita]);

  const luogoSelezionato = luoghi.find((l) => l.id === luogoId);

  useEffect(() => {
    if (!luogoSelezionato || !corsoSelezionato) return;
    const tariffa = corsoSelezionato.oreAula <= 4 ? luogoSelezionato.costoMezzaGiornata : luogoSelezionato.costoGiornataIntera;
    if (tariffa != null) setCostoAffitto(Number(tariffa));
  }, [luogoId, corsoCodec]);

  const canProceedStep1 = corsoCodec && modalita;
  const canProceedStep2 = !!file;
  const canSubmit = luogoId && dataInizio;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file!);
      formData.append(
        "meta",
        JSON.stringify({
          corsoCodec,
          modalita,
          luogoId,
          dataInizio,
          costoAffitto,
          docenti: docentiAssegnati.filter((d) => d.docenteId),
        })
      );

      const res = await axios.post("/api/aule", formData);
      router.push(`/modulo-3/aule/${res.data.aula.id}`);
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setError(err.response.data.errors.map((e: any) => `Riga ${e.line}: ${e.message}`).join(", "));
      } else {
        setError(err.response?.data?.error || "Errore creazione aula");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground mb-1">Nuova Aula</h1>
      <p className="text-sm text-muted-foreground mb-6">Wizard di creazione in 3 step</p>

      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((label, idx) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
              idx < step ? "bg-success text-success-foreground" : idx === step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}>
              {idx < step ? <Check className="h-4 w-4" /> : idx + 1}
            </div>
            <span className={`text-sm ${idx === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{label}</span>
            {idx < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Modalità</Label>
                <div className="grid grid-cols-3 gap-2">
                  {MODALITA_OPTIONS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setModalita(m.value)}
                      className={`p-3 rounded-md border text-sm font-medium transition-colors ${
                        modalita === m.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-secondary"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Corso</Label>
                <select value={corsoCodec} onChange={(e) => setCorsoCodec(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm">
                  <option value="">Seleziona corso</option>
                  {corsiFiltrati.map((c) => <option key={c.codice} value={c.codice}>{c.titolo}</option>)}
                </select>
                {corsiFiltrati.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nessun corso disponibile per questa modalità (serve almeno un template mappato in Modulistica).
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Carica XLS con i discenti dell'aula. Colonne richieste: cognome, nome, codiceFiscale (anche "codice fiscale").
                Opzionali: email/mail, cellulare, dataNascita/"data nascita", azienda (default "Default" se assente), cantiere, sottocantiere, responsabile.
                Altre colonne nel file (tipo corso, stato, ecc.) vengono ignorate — corso e modalità si scelgono qui nel wizard.
              </p>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" id="wizard-file" />
                <label htmlFor="wizard-file" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{file ? file.name : "Clicca per selezionare XLS"}</p>
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Luogo</Label>
                  {showNuovoLuogo ? (
                    <div className="flex gap-2">
                      <Input
                        value={nuovoLuogo}
                        onChange={(e) => setNuovoLuogo(e.target.value)}
                        placeholder="Nome nuova sede"
                        autoFocus
                      />
                      <Button type="button" size="sm" variant="success" onClick={handleCreaLuogo}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setShowNuovoLuogo(false)}>
                        Annulla
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        value={luogoId}
                        onChange={(e) => setLuogoId(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                      >
                        <option value="">Seleziona luogo</option>
                        {luoghi.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
                      </select>
                      <Button type="button" size="sm" variant="outline" onClick={() => setShowNuovoLuogo(true)}>
                        <Plus className="h-3.5 w-3.5" /> Nuovo
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Data Aula</Label>
                  <Input type="date" value={dataInizio} onChange={(e) => setDataInizio(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Costo Affitto Locali (€)</Label>
                  <Input type="number" step="0.01" value={costoAffitto} onChange={(e) => setCostoAffitto(parseFloat(e.target.value) || 0)} />
                  {luogoSelezionato && (luogoSelezionato.costoMezzaGiornata != null || luogoSelezionato.costoGiornataIntera != null) && (
                    <p className="text-xs text-muted-foreground">Precompilato da tariffario sede, modificabile.</p>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <div className="flex justify-between items-center mb-2">
                  <Label>Docenti</Label>
                  <Button size="sm" variant="outline" type="button" onClick={addDocente}>
                    <Plus className="h-3.5 w-3.5" /> Aggiungi
                  </Button>
                </div>
                <div className="space-y-2">
                  {docentiAssegnati.map((d, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <select
                        value={d.docenteId}
                        onChange={(e) => updateDocente(idx, "docenteId", e.target.value)}
                        className="flex-1 h-9 rounded-md border border-input bg-card px-2 text-sm"
                      >
                        <option value="">Docente</option>
                        {docenti.map((doc) => <option key={doc.id} value={doc.id}>{doc.cognome} {doc.nome}</option>)}
                      </select>
                      <Input
                        type="number"
                        placeholder="Ore"
                        value={d.oreEffettiveDocenza}
                        onChange={(e) => updateDocente(idx, "oreEffettiveDocenza", parseFloat(e.target.value) || 0)}
                        className="w-20"
                      />
                      <Input
                        type="number"
                        placeholder="Trasferta €"
                        value={d.trasferAcosto}
                        onChange={(e) => updateDocente(idx, "trasferAcosto", parseFloat(e.target.value) || 0)}
                        className="w-28"
                      />
                      <Button size="sm" variant="ghost" type="button" onClick={() => removeDocente(idx)} className="text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>}

          <div className="flex justify-between mt-6 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0}>
              <ChevronLeft className="h-4 w-4" /> Indietro
            </Button>
            {step < 2 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={(step === 0 && !canProceedStep1) || (step === 1 && !canProceedStep2)}
              >
                Avanti <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="success" onClick={handleSubmit} disabled={!canSubmit || submitting}>
                {submitting ? "Creazione..." : "Crea Aula"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
