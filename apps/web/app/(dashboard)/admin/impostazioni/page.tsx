"use client";

import { useEffect, useState } from "react";
import axios from "axios";

const SETTING_LABELS: Record<string, string> = {
  google_oauth_client_id: "Google OAuth Client ID",
  google_oauth_client_secret: "Google OAuth Client Secret",
  google_oauth_redirect_uri: "Google OAuth Redirect URI",
};

export default function ImpostazioniPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [values, setValues] = useState<Record<string, string>>({
    google_oauth_client_id: "",
    google_oauth_client_secret: "",
    google_oauth_redirect_uri: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await axios.get("/api/admin/settings");
      setSettings(res.data.settings || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (chiave: string) => {
    const valore = values[chiave];
    if (!valore) return;

    setSaving(true);
    try {
      await axios.put("/api/admin/settings", {
        chiave,
        valore,
        descrizione: SETTING_LABELS[chiave],
      });
      setValues({ ...values, [chiave]: "" });
      loadSettings();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Impostazioni Sistema</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Google Calendar OAuth</h2>
        <p className="text-sm text-gray-600 mb-4">
          Configura le credenziali OAuth per la sincronizzazione con Google Calendar (Modulo 3).
        </p>

        <div className="space-y-4">
          {Object.keys(SETTING_LABELS).map((chiave) => {
            const existing = settings.find((s) => s.chiave === chiave);
            return (
              <div key={chiave}>
                <label className="block text-sm font-medium mb-1">
                  {SETTING_LABELS[chiave]}
                  {existing?.isSet && (
                    <span className="ml-2 text-xs text-green-600">✓ Configurato</span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type={chiave.includes("secret") ? "password" : "text"}
                    value={values[chiave]}
                    onChange={(e) => setValues({ ...values, [chiave]: e.target.value })}
                    placeholder={existing?.isSet ? "••••••••" : "Non configurato"}
                    className="flex-1 border px-3 py-2 rounded"
                  />
                  <button
                    onClick={() => handleSave(chiave)}
                    disabled={saving || !values[chiave]}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Salva
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
