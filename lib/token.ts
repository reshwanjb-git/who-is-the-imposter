/** Genereert een lange, willekeurige speler-token (geheim, alleen bij de client bekend). */
export function makeToken(): string {
  return (
    crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  );
}
