"use client";

import { useRouter } from "next/navigation";
import axios from "axios";
import { LogOut } from "lucide-react";
import { type SessionUser } from "@gestionale/types";
import { Button } from "@/components/ui/button";

interface UserMenuProps {
  user: SessionUser;
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await axios.post("/api/auth/logout");
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const initials = `${user.nome?.[0] || ""}${user.cognome?.[0] || ""}`.toUpperCase() || user.email[0].toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
        {initials}
      </div>
      <div className="text-right text-sm hidden sm:block">
        <p className="font-medium text-foreground">{user.nome} {user.cognome}</p>
        <p className="text-muted-foreground text-xs">{user.email}</p>
      </div>
      <Button variant="outline" size="sm" onClick={handleLogout}>
        <LogOut className="h-4 w-4" />
        Logout
      </Button>
    </div>
  );
}
