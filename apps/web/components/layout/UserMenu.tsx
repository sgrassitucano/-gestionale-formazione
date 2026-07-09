"use client";

import { useRouter } from "next/navigation";
import axios from "axios";
import { type SessionUser } from "@gestionale/types";

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

  return (
    <div className="flex items-center space-x-4">
      <div className="text-right text-sm">
        <p className="font-medium">{user.nome} {user.cognome}</p>
        <p className="text-gray-500 text-xs">{user.email}</p>
      </div>
      <button
        onClick={handleLogout}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
      >
        Logout
      </button>
    </div>
  );
}
