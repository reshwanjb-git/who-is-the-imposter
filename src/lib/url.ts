/** Herkent /join/1234 in de URL (gedeelde link of QR-code) en geeft de code terug. */
export function parseJoinCodeFromUrl(): string | null {
  const match = window.location.pathname.match(/\/join\/(\d{4})/);
  return match ? match[1] : null;
}

export function joinUrlFor(code: string): string {
  return `${window.location.origin}/join/${code}`;
}
