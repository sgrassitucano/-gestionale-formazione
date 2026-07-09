export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("it-IT").format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatCF(cf: string): string {
  return cf.toUpperCase();
}
