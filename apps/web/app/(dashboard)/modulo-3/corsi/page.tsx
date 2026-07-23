"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Plus, X, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { AuleSubNav } from "@/components/layout/AuleSubNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const MODALITA_LABELS: Record<string, string> = {
  PRESENZA: "Presenza",
  FAD_SINCRONA: "FAD Sincrona",
  FAD_ASINCRONA: "FAD Asincrona",
};

const MODALITA_OPTIONS = Object.entries(MODALITA_LABELS);

export default function AnagraficaCorsiPage() {
  const [corsi, setCorsi] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedCorso, setExpandedCorso] = useState<string | null>(null);
  const [mappings, setMappings] = useState<Record<string, any[]>>({});
  const [newCorso, setNewCorso] = useState({
    codice: "",
    titolo: "",
    tipo: "FORMAZIONE",
    oreAula: 8,
    oreElearning: 0,
    validitaAnni: 1,
    modalitaConsentite: [] as string[],
  });
  const [newMapping, setNewMapping] = useState({ templateId: "", modalita: "" });

  useEffect(() => {
    loadCorsi();
    axios.get("/api/templates").then((res) => setTemplates(res.data.templates || []));
  }, []);

  const loadCorsi = async () => {
    try {
      const response = await axios.get("/api/corsi");
      setCorsi(response.data.corsi || []);
    } finally {
      setLoading(false);
    }
  };

  const loadMappings = async (codice: string) => {
    const res = await axios.get(`/api/corsi/${codice}/mappings`);
    setMappings((m) => ({ ...m, [codice]: res.data.mappings || [] }));
  };

  const toggleExpand = (codice: string) => {
    if (expandedCorso === codice) {
      setExpandedCorso(null);
    } else {
      setExpandedCorso(codice);
      loadMappings(codice);
    }
  };

  const handleCreateCorso = async (e: React.FormEvent) => {
    e.preventDefault();
    await axios.post("/api/corsi", newCorso);
    setNewCorso({ codice: "", titolo: "", tipo: "FORMAZIONE", oreAula: 8, oreElearning: 0, validitaAnni: 1, modalitaConsentite: [] });
    setShowForm(false);
    loadCorsi();
  };

  const handleAddMapping = async (codice: string) => {
    if (!newMapping.templateId) return;
    await axios.post(`/api/corsi/${codice}/mappings`, {
      templateId: newMapping.templateId,
      modalita: newMapping.modalita || null,
    });
    setNewMapping({ templateId: "", modalita: "" });
    loadMappings(codice);
  };

  const handleRemoveMapping = async (codice: string, mappingId: string) => {
    await axios.delete(`/api/corsi/${codice}/mappings?id=${mappingId}`);
    loadMappings(codice);
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold text-foreground mb-1">Aule</h1>
      <p className="text-sm text-muted-foreground mb-4">Anagrafica corsi, docenti e gestione aule</p>
      <AuleSubNav />

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-foreground">Anagrafica Corsi</h2>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Annulla" : "Nuovo Corso"}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <form onSubmit={handleCreateCorso} className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Codice</Label>
                <Input value={newCorso.codice} onChange={(e) => setNewCorso({ ...newCorso, codice: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Titolo</Label>
                <Input value={newCorso.titolo} onChange={(e) => setNewCorso({ ...newCorso, titolo: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <select value={newCorso.tipo} onChange={(e) => setNewCorso({ ...newCorso, tipo: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm">
                  <option value="FORMAZIONE">Formazione</option>
                  <option value="AGGIORNAMENTO">Aggiornamento</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Ore Aula</Label>
                <Input type="number" value={newCorso.oreAula} onChange={(e) => setNewCorso({ ...newCorso, oreAula: parseInt(e.target.value) })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Ore E-learning</Label>
                <Input type="number" value={newCorso.oreElearning} onChange={(e) => setNewCorso({ ...newCorso, oreElearning: parseInt(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Validità (anni)</Label>
                <Input type="number" value={newCorso.validitaAnni} onChange={(e) => setNewCorso({ ...newCorso, validitaAnni: parseInt(e.target.value) })} required />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Modalità Consentite</Label>
                <div className="flex gap-2">
                  {MODALITA_OPTIONS.map(([value, label]) => {
                    const checked = newCorso.modalitaConsentite.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setNewCorso({
                            ...newCorso,
                            modalitaConsentite: checked
                              ? newCorso.modalitaConsentite.filter((m) => m !== value)
                              : [...newCorso.modalitaConsentite, value],
                          })
                        }
                        className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                          checked ? "border-primary bg-primary/10 text-primary" : "border-input hover:bg-secondary"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button type="submit" variant="success" className="col-span-2">Crea Corso</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Codice</TableHead>
            <TableHead>Titolo</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Ore Aula</TableHead>
            <TableHead>Ore E-learning</TableHead>
            <TableHead>Modalità</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {corsi.map((corso) => (
            <>
              <TableRow key={corso.codice} className="cursor-pointer" onClick={() => toggleExpand(corso.codice)}>
                <TableCell className="font-mono text-xs font-data tabular-nums">{corso.codice}</TableCell>
                <TableCell className="font-medium">{corso.titolo}</TableCell>
                <TableCell><Badge variant={corso.tipo === "FORMAZIONE" ? "default" : "warning"}>{corso.tipo}</Badge></TableCell>
                <TableCell className="font-data tabular-nums">{corso.oreAula}h</TableCell>
                <TableCell className="font-data tabular-nums">{corso.oreElearning}h</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {(corso.modalitaConsentite || []).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    {(corso.modalitaConsentite || []).map((m: string) => (
                      <Badge key={m} variant="secondary" className="text-xs">{MODALITA_LABELS[m]}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-primary flex items-center gap-1 text-sm">
                  {expandedCorso === corso.codice ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Template
                </TableCell>
              </TableRow>
              {expandedCorso === corso.codice && (
                <TableRow className="bg-secondary/30">
                  <TableCell colSpan={7}>
                    <div className="p-3 space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Template mappati</p>
                      {(mappings[corso.codice] || []).length === 0 && (
                        <p className="text-sm text-muted-foreground">Nessun template mappato.</p>
                      )}
                      {(mappings[corso.codice] || []).map((m) => (
                        <div key={m.id} className="flex items-center justify-between text-sm bg-card rounded-md px-3 py-2 border border-border">
                          <span>
                            {m.template.nome}
                            {m.modalita && <Badge variant="secondary" className="ml-2">{MODALITA_LABELS[m.modalita]}</Badge>}
                            {!m.modalita && <Badge variant="secondary" className="ml-2">Tutte le modalità</Badge>}
                          </span>
                          <Button size="sm" variant="ghost" onClick={() => handleRemoveMapping(corso.codice, m.id)} className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}

                      <div className="flex gap-2 pt-2 border-t border-border">
                        <select
                          value={newMapping.templateId}
                          onChange={(e) => setNewMapping({ ...newMapping, templateId: e.target.value })}
                          className="flex-1 h-9 rounded-md border border-input bg-card px-2 text-sm"
                        >
                          <option value="">-- template --</option>
                          {templates.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                        </select>
                        <select
                          value={newMapping.modalita}
                          onChange={(e) => setNewMapping({ ...newMapping, modalita: e.target.value })}
                          className="h-9 rounded-md border border-input bg-card px-2 text-sm"
                        >
                          <option value="">Tutte le modalità</option>
                          {Object.entries(MODALITA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <Button size="sm" variant="success" onClick={() => handleAddMapping(corso.codice)}>Aggiungi</Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
