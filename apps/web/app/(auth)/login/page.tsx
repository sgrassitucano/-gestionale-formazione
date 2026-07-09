"use client";

import { LoginForm } from "@/components/forms/LoginForm";
import { LogoIcon } from "@/components/ui/logo";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 px-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardContent className="pt-8 pb-6">
          <div className="flex flex-col items-center text-center mb-8">
            <LogoIcon className="h-14 w-14 mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Il Tucano</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestionale Formazione Sicurezza
            </p>
          </div>

          <LoginForm />

          <div className="mt-6 pt-6 border-t border-border text-center text-xs text-muted-foreground">
            <p>Demo Credentials</p>
            <p className="font-mono mt-1">admin@example.com / admin123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
