/**
 * Coriandoli PIXEL per la schermata di vittoria: canvas a bassa risoluzione
 * (scalato ×3, nearest-neighbor) così i coriandoli sono quadretti chunky
 * coerenti con l'arte del gioco. Nessuna dipendenza, ~130 particelle max.
 * Con `prefers-reduced-motion` non parte nulla.
 */
import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  spin: number;
  phase: number;
}

export function ConfettiCanvas({ colors }: { colors: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const SCALE = 3;
    const ctx = canvas.getContext('2d')!;
    let w = 0;
    let h = 0;
    const resize = () => {
      w = canvas.width = Math.ceil(window.innerWidth / SCALE);
      h = canvas.height = Math.ceil(window.innerHeight / SCALE);
    };
    resize();
    window.addEventListener('resize', resize);

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const parts: Particle[] = [];
    const spawn = (n: number, burst: boolean) => {
      for (let i = 0; i < n; i++) {
        parts.push({
          x: rand(0, w),
          y: burst ? rand(-h * 0.5, 0) : -3,
          vx: rand(-0.35, 0.35),
          vy: rand(0.5, 1.5),
          size: rand(1.2, 2.8),
          color: colors[Math.floor(Math.random() * colors.length)]!,
          spin: rand(0.04, 0.18),
          phase: rand(0, Math.PI * 2),
        });
      }
    };
    spawn(130, true); // esplosione iniziale

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(33, now - last) / 16.7;
      last = now;
      ctx.clearRect(0, 0, w, h);
      // Dopo il botto, pioggia festosa continua ma leggera.
      if (parts.length < 110 && Math.random() < 0.35) spawn(2, false);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]!;
        p.phase += p.spin * dt;
        p.x += (p.vx + Math.sin(p.phase) * 0.3) * dt;
        p.y += p.vy * dt;
        if (p.y > h + 4) {
          parts.splice(i, 1);
          continue;
        }
        // Il "lato" oscilla con la fase: sembra il coriandolo che ruota.
        const s = Math.max(1, Math.round(p.size * (0.55 + 0.45 * Math.abs(Math.sin(p.phase)))));
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [colors]);

  return <canvas ref={ref} className="confetti-canvas" aria-hidden="true" />;
}
