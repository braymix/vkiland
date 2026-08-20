/**
 * Pixel art degli EROI (modalità Eroi). Un busto vichingo disegnato come griglia
 * di pixel in SVG (autosufficiente, nessuna immagine esterna): l'elmo, la barba e
 * la banda dell'elmo prendono una palette diversa per ogni eroe, così i 12
 * personaggi si distinguono a colpo d'occhio. Sotto il busto compare l'emblema.
 */
import type { HeroId } from '@vikiland/engine';

/** Griglia condivisa del busto (14×14). Le lettere sono i "ruoli" colorati. */
const BUST: readonly string[] = [
  '..............',
  '...HHHHHHHH...',
  '..HHHHHHHHHH..',
  '.hHHAAAAAAHHh.',
  '.hHHHHHHHHHHh.',
  '...SSSSSSSS...',
  '...SSSSSSSS...',
  '...SEESSEES...',
  '...SSSSSSSS...',
  '...SBSSSSBS...',
  '...BBSSSSBB...',
  '...BBBBBBBB...',
  '....BBBBBB....',
  '..............',
];

interface Palette {
  /** Elmo (metallo). */
  H: string;
  /** Banda dell'elmo (accento). */
  A: string;
  /** Barba e capelli. */
  B: string;
  /** Pelle. */
  S: string;
}

const HORN = '#efe7cf';
const EYE = '#20140a';
const SKIN = '#e2b088';

/** Palette per ogni eroe (elmo, accento, barba). La pelle è condivisa. */
const HERO_PALETTES: Readonly<Record<HeroId, Palette>> = {
  donoLegname: { H: '#6b8e4e', A: '#3d5a2b', B: '#7a4a1e', S: SKIN },
  donoPietra: { H: '#8a8f96', A: '#565b61', B: '#4a4a4a', S: SKIN },
  donoLana: { H: '#d8d2c4', A: '#a8a090', B: '#caa15a', S: SKIN },
  donoOrzo: { H: '#d9a838', A: '#a87a1e', B: '#b5842f', S: SKIN },
  donoFerro: { H: '#5a6472', A: '#3a4250', B: '#2e3440', S: SKIN },
  mutaporto: { H: '#2f6f8f', A: '#1d4a63', B: '#173a4f', S: SKIN },
  mercante: { H: '#c9a227', A: '#8a6d12', B: '#5a3d1a', S: SKIN },
  apripista: { H: '#9c6b3f', A: '#6b4526', B: '#3a2416', S: SKIN },
  maestro: { H: '#b06a2c', A: '#7a4518', B: '#4a3020', S: SKIN },
  comandante: { H: '#7a5c8f', A: '#4d3a5c', B: '#2b2030', S: SKIN },
};

function colorFor(role: string, pal: Palette): string | null {
  switch (role) {
    case 'H':
      return pal.H;
    case 'A':
      return pal.A;
    case 'B':
      return pal.B;
    case 'S':
      return pal.S;
    case 'h':
      return HORN;
    case 'E':
      return EYE;
    default:
      return null;
  }
}

interface Props {
  hero: HeroId;
  /** Lato in px dell'intera pixel art (default 84). */
  size?: number;
  emblem?: string | undefined;
}

export function HeroArt({ hero, size = 84, emblem }: Props) {
  const pal = HERO_PALETTES[hero] ?? HERO_PALETTES.donoLegname;
  const cols = BUST[0]!.length;
  const rows = BUST.length;
  const cell = size / cols;
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < rows; y++) {
    const line = BUST[y]!;
    for (let x = 0; x < cols; x++) {
      const c = colorFor(line[x]!, pal);
      if (!c) continue;
      rects.push(
        <rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell + 0.5} height={cell + 0.5} fill={c} />
      );
    }
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ imageRendering: 'pixelated', display: 'block' }}
      role="img"
      aria-label={hero}
    >
      <rect x={0} y={0} width={size} height={size} fill="transparent" />
      {rects}
      {emblem && (
        <text x={size - cell * 2.2} y={size - cell * 1.2} fontSize={cell * 3.4} textAnchor="middle">
          {emblem}
        </text>
      )}
    </svg>
  );
}
