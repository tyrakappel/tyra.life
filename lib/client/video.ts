/**
 * Film i webbläsaren: kodar om det telefonen spelade in till något sajten kan
 * visa, och plockar ut en posterbild ur den. Porterad från golfsnack.
 *
 * Telefonen ger .mov med HEVC, ofta i HDR. Safari spelar det, Firefox inte,
 * och filerna är stora: en kvart på fjorton sekunder väger femton megabyte.
 * Omkodningen tar ner samma klipp till knappt fem utan att man ser skillnaden
 * på en telefonskärm, eftersom vinsten sitter i bithastigheten och inte i
 * formatet. Kamerans åtta megabit i sekunden är tre gånger mer än en webbsida
 * behöver.
 *
 * Arbetet sker på den enhet som laddar upp, på en Mac eller en iPhone. Det är också den enda plats där avkodningen av HEVC är gratis, för
 * där finns hårdvaran som gör den. Ingen wasm behövs, allt går genom
 * webbläsarens egen WebCodecs.
 */

/** Höjden filmerna skalas till. Modalen visar dem aldrig större än så. */
const TARGET_HEIGHT = 1280;

/** Bithastighet för bilden. Räcker gott för 720 på en telefon. */
const VIDEO_BITRATE = 2_500_000;

/** Bithastighet för ljudet. */
const AUDIO_BITRATE = 128_000;

/** Var i klippet posterbilden hämtas. Första bildrutan är ofta suddig. */
const POSTER_AT_SECONDS = 0.5;

/** Posterbildens bredd. Den visas i rymden, som mest ungefär så här stor. */
const POSTER_WIDTH = 1200;

export interface ConvertedVideo {
  /** Filmen som mp4, klar att läggas i hinken. */
  video: Blob;
  /** Stillbilden som visas i rymden tills man hovrar. */
  poster: Blob;
  width: number;
  height: number;
}

/** Sant för det telefonen lämnar ifrån sig, alltså mov och mp4. */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/") || /\.(mov|mp4|m4v)$/i.test(file.name);
}

/**
 * Kodar om filmen och plockar posterbilden.
 *
 * `onProgress` får ett tal mellan 0 och 1. Omkodningen är det enda i
 * uppladdningen som tar mätbar tid, ett par sekunder för ett kort klipp, och
 * utan återkoppling ser gränssnittet ut att ha hängt sig.
 */
export async function convertVideo(
  file: File,
  onProgress?: (fraction: number) => void
): Promise<ConvertedVideo> {
  const {
    Input,
    Output,
    Conversion,
    BlobSource,
    BufferTarget,
    Mp4OutputFormat,
    ALL_FORMATS,
    CanvasSink,
  } = await import("mediabunny");

  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });

  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new Error("Filen har inget videospår");
  if (!(await track.canDecode())) {
    throw new Error("Webbläsaren kan inte läsa den här filmen. Prova från en iPhone eller Mac.");
  }

  // Postern först. Den hämtas ur källan och inte ur resultatet, så att den
  // finns även om omkodningen skulle avbrytas.
  const sink = new CanvasSink(track, { width: POSTER_WIDTH });
  const frame = await sink.getCanvas(Math.min(POSTER_AT_SECONDS, await track.computeDuration()));
  if (!frame) throw new Error("Kunde inte läsa någon bildruta ur filmen");

  const poster = await new Promise<Blob | null>((resolve) =>
    (frame.canvas as HTMLCanvasElement).toBlob(resolve, "image/webp", 0.8)
  );
  if (!poster) throw new Error("Kunde inte spara posterbilden");

  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });

  const conversion = await Conversion.init({
    input,
    output,
    // `contain` behåller proportionerna. Klippen är stående från telefonen och
    // ska inte beskäras för att passa en siffra.
    video: { codec: "avc", bitrate: VIDEO_BITRATE, height: TARGET_HEIGHT, fit: "contain" },
    audio: { codec: "aac", bitrate: AUDIO_BITRATE },
  });

  if (onProgress) conversion.onProgress = (fraction) => onProgress(fraction);
  await conversion.execute();

  const buffer = (output.target as InstanceType<typeof BufferTarget>).buffer;
  if (!buffer) throw new Error("Omkodningen gav ingen fil");

  // Måtten tas ur posterbilden. Den är skalad efter samma proportioner som
  // filmen, och det är postern rutan i rymden mäts på.
  return {
    video: new Blob([buffer], { type: "video/mp4" }),
    poster,
    width: frame.canvas.width,
    height: frame.canvas.height,
  };
}
