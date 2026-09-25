/** Genereert een willekeurige 4-cijferige roomcode ("0000"–"9999"). */
export function generateRoomCode(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}
