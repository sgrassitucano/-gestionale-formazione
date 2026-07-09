export interface LezioneSlot {
  data: Date;
  oraInizio: string; // "HH:MM"
  oraFine: string;
}

export function slotsOverlap(a: LezioneSlot, b: LezioneSlot): boolean {
  if (a.data.toDateString() !== b.data.toDateString()) return false;

  const aStart = timeToMinutes(a.oraInizio);
  const aEnd = timeToMinutes(a.oraFine);
  const bStart = timeToMinutes(b.oraInizio);
  const bEnd = timeToMinutes(b.oraFine);

  return aStart < bEnd && bStart < aEnd;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function findConflicts(
  candidate: LezioneSlot,
  existing: LezioneSlot[]
): LezioneSlot[] {
  return existing.filter((slot) => slotsOverlap(candidate, slot));
}
