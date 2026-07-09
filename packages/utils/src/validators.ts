export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validateCF(cf: string): boolean {
  // TODO: Implement CF (Codice Fiscale) validation
  return /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/.test(cf);
}

export function validatePIVA(piva: string): boolean {
  // TODO: Implement PIVA validation
  return /^[0-9]{11}$/.test(piva);
}
