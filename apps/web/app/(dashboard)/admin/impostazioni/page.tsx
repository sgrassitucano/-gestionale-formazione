"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { CheckCircle2, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (chiave: string) => {
    const valore = values[chiave];
    if (!valore) return;
    setSaving(true);
    try {
      await axios.put("/api/admin/settings", { chiave, valore, descrizione: SETTING_LABELS[chiave] });
      setValues({ ...values, [chiave]: "" });
      loadSettings();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground mb-1">Impostazioni Sistema</h1>
      <p className="text-sm text-muted-foreground mb-6">Configurazione integrazioni esterne</p>

      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold text-foreground mb-1">Google Calendar OAuth</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Configura le credenziali OAuth per la sincronizzazione con Google Calendar (Modulo 3).
          </p>

          <div className="space-y-4">
            {Object.keys(SETTING_LABELS).map((chiave) => {
              const existing = settings.find((s) => s.chiave === chiave);
              return (
                <div key={chiave} className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    {SETTING_LABELS[chiave]}
                    {existing?.isSet && (
                      <span className="flex items-center gap-1 text-xs text-success font-normal">
                        <CheckCircle2 className="h-3 w-3" /> Configurato
                      </span>
                    )}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type={chiave.includes("secret") ? "password" : "text"}
                      value={values[chiave]}
                      onChange={(e) => setValues({ ...values, [chiave]: e.target.value })}
                      placeholder={existing?.isSet ? "••••••••" : "Non configurato"}
                      className="flex-1"
                    />
                    <Button onClick={() => handleSave(chiave)} disabled={saving || !values[chiave]}>
                      <Save className="h-4 w-4" /> Salva
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
