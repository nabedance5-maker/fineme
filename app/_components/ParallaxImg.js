'use client';
import { useEffect, useRef } from 'react';

export function ParallaxImg({ src, alt }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      el.style.transform = `translateY(${window.scrollY * 0.28}px)`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      style={{
        width: '100%',
        height: '120%',
        objectFit: 'cover',
        display: 'block',
        opacity: 0.88,
        willChange: 'transform',
        transform: 'translateY(0)',
      }}
    />
  );
}
