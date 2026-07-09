"use client";

import { useState } from "react";
import axios from "axios";

export default function ImportazionePage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errors, setErrors] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
    setResult(null);
    setErrors([]);
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post("/api/import/upload", formData);

      if (response.data.success) {
        setResult({
          success: true,
          rowsProcessed: response.data.rowsProcessed,
          errorsCount: response.data.errorsCount,
        });
      } else {
        setResult({
          success: false,
          rowsProcessed: response.data.rowsProcessed,
          errorsCount: response.data.errorsCount,
        });
        setErrors(response.data.errors || []);
      }
    } catch (error: any) {
      setErrors([
        {
          line: 1,
          message: error.response?.data?.error || "Import failed",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Importazione Discenti</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
            id="file-input"
          />
          <label htmlFor="file-input" className="cursor-pointer">
            <div className="text-gray-600">
              <p className="text-lg font-medium mb-2">Drag & drop XLS file</p>
              <p className="text-sm">or click to select</p>
              {file && (
                <p className="text-sm text-blue-600 mt-2">{file.name}</p>
              )}
            </div>
          </label>
        </div>

        <button
          onClick={handleImport}
          disabled={!file || loading}
          className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Importando..." : "Importa"}
        </button>
      </div>

      {result && (
        <div
          className={`rounded-lg p-6 mb-6 ${
            result.success ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"
          }`}
        >
          <p className="font-semibold mb-2">
            {result.success ? "✓ Importazione riuscita" : "⚠ Importazione con errori"}
          </p>
          <p className="text-sm">
            {result.rowsProcessed} righe importate, {result.errorsCount} errori
          </p>
        </div>
      )}

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="font-semibold mb-4 text-red-900">Errori:</p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {errors.map((err, idx) => (
              <div key={idx} className="text-sm text-red-700">
                <span className="font-mono bg-red-100 px-2 py-1 rounded">
                  Riga {err.line}
                </span>
                : {err.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
