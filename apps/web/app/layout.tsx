import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Gestionale Formazione — Il Tucano",
  description: "Training management system with compliance automation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
