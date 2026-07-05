/**
 * Popup di benvenuto del «Breve tutorial»: coriandoli pixel + la frase
 * portafortuna «Benvenuto nel magico mondo di Viking-Island» con tanti 👏.
 * I coriandoli sono disegnati su canvas (quadratini nei colori dei clan),
 * partono dall'alto con un paio di ondate e cadono con gravità; rispetta
 * `prefers-reduced-motion`. L'overlay si chiude col bottone, col tap o con
 * Invio/Esc.
 */
import { useEffect, useRef } from 'react';
import { it } from '../i18n';

const CONFETTI_COLORS = ['#e7b94c', '#c0392b', '#2e6fb7', '#2e8b57', '#d9a525', '#8e44ad', '#f4f4f4'];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
}

/** Canvas a tutto schermo con i coriandoli che cadono. */
function ConfettiCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const parts: Particle[] = [];
    const spawn = (n: number) => {
      for (let i = 0; i < n; i++) {
        parts.push({
          x: Math.random() * canvas.width,
          y: -10 * dpr - Math.random() * canvas.height * 0.35,
          vx: (Math.random() - 0.5) * 2.2 * dpr,
          vy: (1 + Math.random() * 2.6) * dpr,
          size: (3 + Math.random() * 4) * dpr,
          color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0]!,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.25,
        });
      }
    };

    const timers: ReturnType<typeof setTimeout>[] = [];
    if (!reduce) {
      spawn(120);
      timers.push(setTimeout(() => spawn(70), 450));
      timers.push(setTimeout(() => spawn(70), 950));
    }

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(2.5, (now - last) / 16.67);
      last = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]!;
        p.vy += 0.045 * dpr * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
        if (p.y > canvas.height + 20 * dpr) parts.splice(i, 1);
      }
      if (parts.length > 0) raf = requestAnimationFrame(frame);
    };
    if (!reduce) raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="welcome-confetti" aria-hidden="true" />;
}

/** Riga di applausi (👏) che ondeggiano. */
function Claps() {
  return (
    <div className="welcome-claps" aria-hidden="true">
      {['0s', '0.1s', '0.2s', '0.3s', '0.4s', '0.5s', '0.6s'].map((delay, i) => (
        <span key={i} style={{ animationDelay: delay }}>
          👏
        </span>
      ))}
    </div>
  );
}

export function WelcomeConfetti({ onStart }: { onStart: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') onStart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  return (
    <div className="welcome-overlay" onClick={onStart}>
      <ConfettiCanvas />
      <div className="welcome-card pixel-frame" onClick={(e) => e.stopPropagation()}>
        <Claps />
        <h2 className="welcome-title">{it.demo.benvenutoTitolo}</h2>
        <Claps />
        <button className="pxbtn" onClick={onStart}>
          {it.demo.benvenutoVai} 👏
        </button>
      </div>
    </div>
  );
}
