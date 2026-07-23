"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Plus, ArrowRight, Pencil, Check, X, Tag } from "lucide-react";
import { AuleSubNav } from "@/components/layout/AuleSubNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const STATO_VARIANT: Record<string, "warning" | "default" | "success"> = {
  PIANIFICATA: "warning",
  IN_CORSO: "default",
  CONCLUSA: "success",
};

const MODALITA_LABELS: Record<string, string> = {
  PRESENZA: "Presenza",
  FAD_SINCRONA: "FAD Sincrona",
  FAD_ASINCRONA: "FAD Asincrona",
};

const EMPTY_EDIT = { nome: "", corsoCodec: "", modalita: "PRESENZA", luogoId: "" };

export default function AulePage() {
  const [aule, setAule] = useState<any[]>([]);
  const [corsi, setCorsi] = useState<any[]>([]);
  const [luoghi, setLuoghi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStato, setFilterStato] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);

  useEffect(() => {
    loadAule();
  }, [filterStato]);

  useEffect(() => {
    axios.get("/api/corsi").then((res) => setCorsi(res.data.corsi || []));
    axios.get("/api/luoghi").then((res) => setLuoghi(res.data.luoghi || []));
  }, []);

  const loadAule = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStato) params.stato = filterStato;
      const res = await axios.get("/api/aule", { params });
      setAule(res.data.aule || []);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (a: any) => {
    setEditingId(a.id);
    setEditForm({
      nome: a.nome || "",
      corsoCodec: a.corsoCodec || "",
      modalita: a.modalita || "PRESENZA",
      luogoId: a.luogoId || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(EMPTY_EDIT);
  };

  const saveEdit = async (id: string) => {
    await axios.put(`/api/aule/${id}`, {
      nome: editForm.nome || null,
      corsoCodec: editForm.corsoCodec,
      modalita: editForm.modalita,
      luogoId: editForm.luogoId || null,
    });
    setEditingId(null);
    loadAule();
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold text-foreground mb-1">Aule</h1>
      <p className="text-sm text-muted-foreground mb-4">Anagrafica corsi, docenti e gestione aule</p>
      <AuleSubNav />

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          {["", "PIANIFICATA", "IN_CORSO", "CONCLUSA"].map((s) => (
            <Button key={s} size="sm" variant={filterStato === s ? "default" : "outline"} onClick={() => setFilterStato(s)}>
              {s || "Tutte"}
            </Button>
          ))}
        </div>
        <Link href="/modulo-3/aule/new">
          <Button><Plus className="h-4 w-4" /> Nuova Aula</Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Corso</TableHead>
            <TableHead>Modalità</TableHead>
            <TableHead>Luogo</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead>Discenti</TableHead>
            <TableHead>Docenti</TableHead>
            <TableHead>Data Aula</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {aule.map((a) => {
            const editing = editingId === a.id;
            const bloccata = a.stato === "CONCLUSA";
            return (
              <TableRow key={a.id}>
                <TableCell>
                  {editing ? (
                    <Input
                      value={editForm.nome}
                      onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                      placeholder="Es. ID-47518"
                      className="h-8 w-36"
                    />
                  ) : a.nome ? (
                    <Badge variant="secondary" className="gap-1"><Tag className="h-3 w-3" />{a.nome}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {editing ? (
                    <select
                      value={editForm.corsoCodec}
                      onChange={(e) => setEditForm({ ...editForm, corsoCodec: e.target.value })}
                      className="flex h-8 w-full min-w-[200px] rounded-md border border-input bg-card px-2 text-sm"
                    >
                      <option value="">Seleziona corso</option>
                      {corsi.map((c) => (
                        <option key={c.codice} value={c.codice}>{c.titolo}</option>
                      ))}
                    </select>
                  ) : (
                    a.corso?.titolo
                  )}
                </TableCell>
                <TableCell>
                  {editing ? (
                    <select
                      value={editForm.modalita}
                      onChange={(e) => setEditForm({ ...editForm, modalita: e.target.value })}
                      className="flex h-8 rounded-md border border-input bg-card px-2 text-sm"
                    >
                      {Object.entries(MODALITA_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>{label}</option>
                      ))}
                    </select>
                  ) : (
                    <Badge variant="secondary">{MODALITA_LABELS[a.modalita] || a.modalita}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {editing ? (
                    <select
                      value={editForm.luogoId}
                      onChange={(e) => setEditForm({ ...editForm, luogoId: e.target.value })}
                      className="flex h-8 w-full min-w-[160px] rounded-md border border-input bg-card px-2 text-sm"
                    >
                      <option value="">Nessun luogo</option>
                      {luoghi.map((l) => (
                        <option key={l.id} value={l.id}>{l.nome}</option>
                      ))}
                    </select>
                  ) : (
                    a.luogo?.nome ?? "-"
                  )}
                </TableCell>
                <TableCell><Badge variant={STATO_VARIANT[a.stato]} dot>{a.stato}</Badge></TableCell>
                <TableCell className="font-data tabular-nums">{a.iscrizioni?.length || 0}</TableCell>
                <TableCell className="font-data tabular-nums">{a.docentilezioni?.length || 0}</TableCell>
                <TableCell>{a.dataInizio ? new Date(a.dataInizio).toLocaleDateString("it-IT") : "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end items-center">
                    {editing ? (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => saveEdit(a.id)} title="Salva">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={cancelEdit} title="Annulla">
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-sky-600 hover:text-sky-700 hover:bg-sky-50 disabled:opacity-30"
                          onClick={() => startEdit(a)}
                          disabled={bloccata}
                          title={bloccata ? "Aula conclusa: non modificabile" : "Modifica aula"}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Link href={`/modulo-3/aule/${a.id}`}>
                          <Button variant="ghost" size="sm">Apri <ArrowRight className="h-3.5 w-3.5" /></Button>
                        </Link>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
