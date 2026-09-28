/**
 * SHA-256 av en fil, som hex. Räknas på originalfilen innan den kodas om,
 * så samma bild alltid ger samma avtryck oavsett filnamn.
 */
export async function sha256Hex(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}
