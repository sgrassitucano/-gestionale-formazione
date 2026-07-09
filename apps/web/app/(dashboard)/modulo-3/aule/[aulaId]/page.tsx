"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import axios from "axios";
import { AulaCalendar } from "@/components/calendar/AulaCalendar";

type Tab = "calendario" | "discenti" | "docenti" | "modulistica" | "gcal";

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
    } catch (error) {
      console.error(error);
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
    try {
      await axios.put(`/api/aule/${aulaId}`, { stato: "IN_CORSO" });
      loadAula();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading || !aula) return <div>Loading...</div>;

  return (
    <div className="max-w-6xl">
      {gcalMessage && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          {gcalMessage}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{aula.corso?.titolo}</h1>
            <p className="text-gray-600">{aula.luogo}</p>
            <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
              {aula.stato}
            </span>
          </div>
          <div className="flex gap-2">
            {aula.stato === "PIANIFICATA" && (
              <button onClick={handleStartAula} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Avvia Aula
              </button>
            )}
            {aula.stato === "IN_CORSO" && !aula.bilancioSnapshot && (
              <button onClick={handleCloseAula} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
                Chiudi Aula
              </button>
            )}
          </div>
        </div>

        {aula.bilancioSnapshot && (
          <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <p className="text-xs text-gray-500">Ricavo</p>
              <p className="font-bold text-green-600">€ {Number(aula.bilancioSnapshot.ricavo).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Costo</p>
              <p className="font-bold text-red-600">€ {Number(aula.bilancioSnapshot.costoTotale).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Margine</p>
              <p className="font-bold text-blue-600">€ {Number(aula.bilancioSnapshot.margine).toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 mb-6 border-b">
        {(["calendario", "discenti", "docenti", "modulistica", "gcal"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 px-2 capitalize ${tab === t ? "border-b-2 border-blue-600 font-semibold" : "text-gray-500"}`}
          >
            {t === "gcal" ? "Google Calendar" : t}
          </button>
        ))}
      </div>

      {tab === "calendario" && <CalendarioTab aula={aula} onUpdate={loadAula} />}
      {tab === "discenti" && <DiscentiTab aula={aula} onUpdate={loadAula} />}
      {tab === "docenti" && <DocentiTab aula={aula} onUpdate={loadAula} />}
      {tab === "modulistica" && <ModulisticaTab aula={aula} onUpdate={loadAula} />}
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
      <div className="mb-4 flex justify-between items-center">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showForm ? "Annulla" : "+ Aggiungi Lezione"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddLezione} className="bg-white rounded-lg shadow p-4 mb-4 flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Data</label>
            <input
              type="date"
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
              className="border px-3 py-2 rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ora Inizio</label>
            <input
              type="time"
              value={form.oraInizio}
              onChange={(e) => setForm({ ...form, oraInizio: e.target.value })}
              className="border px-3 py-2 rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ora Fine</label>
            <input
              type="time"
              value={form.oraFine}
              onChange={(e) => setForm({ ...form, oraFine: e.target.value })}
              className="border px-3 py-2 rounded"
              required
            />
          </div>
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Salva
          </button>
        </form>
      )}

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      <div className="bg-white rounded-lg shadow p-4">
        <AulaCalendar lezioni={aula.lezioni || []} />
      </div>
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
    try {
      await axios.post(`/api/aule/${aula.id}/iscrizioni`, { discenteId });
      onUpdate();
      setShowAdd(false);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <button onClick={() => setShowAdd(!showAdd)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          {showAdd ? "Annulla" : "+ Aggiungi Discente"}
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-lg shadow p-4 mb-4 max-h-60 overflow-y-auto">
          <p className="font-semibold mb-2">Esigenze Pendenti ({esigenze.length})</p>
          {esigenze.map((d) => (
            <div key={d.id} className="flex justify-between items-center py-2 border-t">
              <span>{d.cognome} {d.nome} — {d.azienda?.ragioneSociale}</span>
              <button onClick={() => handleAdd(d.id)} className="text-blue-600 hover:text-blue-800 text-sm">
                Aggiungi
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Nome</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Cantiere</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Responsabile</th>
            </tr>
          </thead>
          <tbody>
            {aula.iscrizioni?.map((i: any) => (
              <tr key={i.id} className="border-t">
                <td className="px-6 py-3 text-sm">{i.discente.cognome} {i.discente.nome}</td>
                <td className="px-6 py-3 text-sm">{i.cantiere || "-"}</td>
                <td className="px-6 py-3 text-sm">{i.responsabile || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
    try {
      await axios.post(`/api/aule/${aula.id}/docenti`, form);
      setForm({ docenteId: "", oreEffettiveDocenza: 0, trasferAcosto: 0 });
      setShowAdd(false);
      onUpdate();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <button onClick={() => setShowAdd(!showAdd)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          {showAdd ? "Annulla" : "+ Assegna Docente"}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white rounded-lg shadow p-4 mb-4 flex gap-4 items-end">
          <select
            value={form.docenteId}
            onChange={(e) => setForm({ ...form, docenteId: e.target.value })}
            className="border px-3 py-2 rounded flex-1"
            required
          >
            <option value="">Seleziona docente</option>
            {docenti.map((d) => (
              <option key={d.id} value={d.id}>{d.cognome} {d.nome} (€{Number(d.tariffaOraria)}/h)</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Ore"
            value={form.oreEffettiveDocenza}
            onChange={(e) => setForm({ ...form, oreEffettiveDocenza: parseFloat(e.target.value) })}
            className="border px-3 py-2 rounded w-24"
            required
          />
          <input
            type="number"
            placeholder="Trasferta €"
            value={form.trasferAcosto}
            onChange={(e) => setForm({ ...form, trasferAcosto: parseFloat(e.target.value) })}
            className="border px-3 py-2 rounded w-32"
          />
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Assegna
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Docente</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Ore</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Tariffa/h</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Trasferta</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Costo Totale</th>
            </tr>
          </thead>
          <tbody>
            {aula.docentilezioni?.map((dl: any) => (
              <tr key={dl.id} className="border-t">
                <td className="px-6 py-3 text-sm">{dl.docente.cognome} {dl.docente.nome}</td>
                <td className="px-6 py-3 text-sm">{Number(dl.oreEffettiveDocenza)}</td>
                <td className="px-6 py-3 text-sm">€ {Number(dl.docente.tariffaOraria)}</td>
                <td className="px-6 py-3 text-sm">€ {Number(dl.trasferAcosto)}</td>
                <td className="px-6 py-3 text-sm font-semibold">
                  € {(Number(dl.oreEffettiveDocenza) * Number(dl.docente.tariffaOraria) + Number(dl.trasferAcosto)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModulisticaTab({ aula, onUpdate }: any) {
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

    try {
      await axios.post(`/api/aule/${aula.id}/archivio`, formData);
      setUploadFile(null);
      axios.get(`/api/aule/${aula.id}/archivio`).then((res) => setArchivio(res.data.archivio || []));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <p className="font-semibold mb-3">Genera Documenti</p>
        {templates.length === 0 ? (
          <p className="text-sm text-gray-500">Nessun template mappato per questo corso.</p>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="flex justify-between items-center">
                <span className="text-sm">{t.nome}</span>
                <button onClick={() => handleGenerate(t.id)} className="text-blue-600 hover:text-blue-800 text-sm">
                  Genera PDF →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <p className="font-semibold mb-3">Archivio Documenti</p>
        <div className="flex gap-2 mb-4">
          <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)} className="border px-3 py-2 rounded">
            <option value="REGISTRO">Registro</option>
            <option value="VERBALE">Verbale</option>
            <option value="TEST">Test</option>
            <option value="ATTESTATO">Attestato</option>
          </select>
          <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="border px-3 py-2 rounded flex-1" />
          <button onClick={handleUploadArchivio} disabled={!uploadFile} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50">
            Carica
          </button>
        </div>

        <div className="space-y-1">
          {archivio.map((a) => (
            <div key={a.id} className="flex justify-between items-center py-1 text-sm">
              <span>{a.tipoDocumento}</span>
              <a href={a.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800">
                Scarica
              </a>
            </div>
          ))}
        </div>
      </div>
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
    <div className="bg-white rounded-lg shadow p-6">
      <p className="mb-4 text-sm text-gray-600">
        Sincronizza le lezioni di questa aula con Google Calendar. Richiede connessione OAuth
        (configurabile in Impostazioni → Google Calendar OAuth).
      </p>

      <div className="flex gap-4">
        <button onClick={handleConnect} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Connetti Google Calendar
        </button>
        <button onClick={handleSync} disabled={syncing} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50">
          {syncing ? "Sincronizzando..." : "Sincronizza Lezioni"}
        </button>
      </div>

      {syncResult && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
          <p>✓ Sincronizzate: {syncResult.syncedCount}</p>
          <p>✗ Fallite: {syncResult.failedCount}</p>
        </div>
      )}
    </div>
  );
}
