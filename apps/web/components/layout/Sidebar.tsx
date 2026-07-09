"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type SessionUser } from "@gestionale/types";

interface SidebarProps {
  user: SessionUser;
  modules: Array<{ id: number; name: string; visible: boolean; route: string }>;
}

export function Sidebar({ user, modules }: SidebarProps) {
  const pathname = usePathname();

  const visibleModules = modules.filter((m) => m.visible);

  return (
    <aside className="w-64 bg-gray-800 text-white h-screen flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold">Il Tucano</h2>
        <p className="text-sm text-gray-400">v0.1</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <Link
          href="/dashboard"
          className={`block px-4 py-2 rounded mb-2 ${
            pathname === "/dashboard"
              ? "bg-blue-600"
              : "hover:bg-gray-700"
          }`}
        >
          Dashboard
        </Link>

        <div className="my-4 border-t border-gray-700" />

        <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
          Moduli
        </p>

        {visibleModules.map((mod) => (
          <Link
            key={mod.id}
            href={mod.route}
            className={`block px-4 py-2 rounded mb-1 ${
              pathname.includes(`modulo-${mod.id}`) || pathname === mod.route
                ? "bg-blue-600"
                : "hover:bg-gray-700"
            }`}
          >
            {mod.name}
          </Link>
        ))}

        {user.ruolo === "SUPERADMIN" && (
          <>
            <div className="my-4 border-t border-gray-700" />
            <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
              Admin
            </p>
            <Link
              href="/admin/permissions"
              className={`block px-4 py-2 rounded mb-1 ${
                pathname === "/admin/permissions"
                  ? "bg-blue-600"
                  : "hover:bg-gray-700"
              }`}
            >
              Permissions
            </Link>
            <Link
              href="/admin/audit-log"
              className={`block px-4 py-2 rounded mb-1 ${
                pathname === "/admin/audit-log"
                  ? "bg-blue-600"
                  : "hover:bg-gray-700"
              }`}
            >
              Audit Log
            </Link>
            <Link
              href="/admin/utenti"
              className={`block px-4 py-2 rounded mb-1 ${
                pathname === "/admin/utenti"
                  ? "bg-blue-600"
                  : "hover:bg-gray-700"
              }`}
            >
              Utenti
            </Link>
            <Link
              href="/admin/impostazioni"
              className={`block px-4 py-2 rounded mb-1 ${
                pathname === "/admin/impostazioni"
                  ? "bg-blue-600"
                  : "hover:bg-gray-700"
              }`}
            >
              Impostazioni
            </Link>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <p className="text-sm text-gray-400">
          {user.nome} {user.cognome}
        </p>
        <p className="text-xs text-gray-500">{user.email}</p>
        <p className="text-xs text-gray-500 uppercase font-semibold mt-1">
          {user.ruolo}
        </p>
      </div>
    </aside>
  );
}
