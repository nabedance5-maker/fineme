'use client';
import { useEffect, useRef, useState } from 'react';

export function StatNumber({ value }) {
  const str = String(value);
  const match = str.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (!match) return <span>{value}</span>;

  const target = parseFloat(match[1]);
  const suffix = match[2];
  const isInt = Number.isInteger(target);
  const [current, setCurrent] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1400;
          const startTime = performance.now();
          const animate = (now) => {
            const t = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
            const val = eased * target;
            setCurrent(isInt ? Math.round(val) : Math.round(val * 10) / 10);
            if (t < 1) requestAnimationFrame(animate);
            else setCurrent(target);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, isInt]);

  return <span ref={ref}>{current}{suffix}</span>;
}
