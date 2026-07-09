"use client";

export default function AulePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Modulo 3: Aule + Calendario</h1>
      <p className="text-gray-600">Implementation in progress...</p>
      <ul className="mt-4 list-disc list-inside space-y-2 text-gray-600">
        <li>Aule creation with discenti/docenti assignment</li>
        <li>Visual calendar (drag-drop lezioni)</li>
        <li>Google Calendar sync (OAuth)</li>
        <li>State machine (Pianificata → In Corso → Conclusa)</li>
        <li>Conflict validation (docent/location overlaps)</li>
      </ul>
    </div>
  );
}
