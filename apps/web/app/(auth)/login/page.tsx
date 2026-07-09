"use client";

import { LoginForm } from "@/components/forms/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Il Tucano
          </h1>
          <p className="text-gray-600">
            Gestionale Formazione Sicurezza
          </p>
        </div>

        <LoginForm />

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Demo Credentials:</p>
          <p className="font-mono text-xs mt-2">
            admin@example.com / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
