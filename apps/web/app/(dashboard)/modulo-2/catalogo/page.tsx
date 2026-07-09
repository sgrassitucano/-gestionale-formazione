"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Plus, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default function CatalogoPage() {
  const [corsi, setCorsi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCorso, setNewCorso] = useState({
    codice: "",
    titolo: "",
    tipo: "FORMAZIONE",
    oreAula: 8,
    oreElearning: 0,
    validitaAnni: 1,
  });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadCorsi();
  }, []);

  const loadCorsi = async () => {
    try {
      const response = await axios.get("/api/corsi");
      setCorsi(response.data.corsi || []);
    } catch (error) {
      console.error("Error loading corsi:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCorso = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("/api/corsi", newCorso);
      setNewCorso({ codice: "", titolo: "", tipo: "FORMAZIONE", oreAula: 8, oreElearning: 0, validitaAnni: 1 });
      setShowForm(false);
      loadCorsi();
    } catch (error) {
      console.error("Error creating corso:", error);
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Catalogo Corsi</h1>
          <p className="text-sm text-muted-foreground">Gestione corsi di formazione</p>
        </div>
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
                <select
                  value={newCorso.tipo}
                  onChange={(e) => setNewCorso({ ...newCorso, tipo: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                >
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
              <Button type="submit" variant="success" className="col-span-2">
                Crea Corso
              </Button>
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
            <TableHead>Validità</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {corsi.map((corso) => (
            <TableRow key={corso.codice}>
              <TableCell className="font-mono text-xs">{corso.codice}</TableCell>
              <TableCell className="font-medium">{corso.titolo}</TableCell>
              <TableCell>
                <Badge variant={corso.tipo === "FORMAZIONE" ? "default" : "warning"}>{corso.tipo}</Badge>
              </TableCell>
              <TableCell>{corso.oreAula}h</TableCell>
              <TableCell>{corso.oreElearning}h</TableCell>
              <TableCell>{corso.validitaAnni} anni</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
