import React, { useEffect, useRef } from 'react';

export const Starfield: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let w: number, h: number;
    const setCanvasSize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    const stars: { x: number; y: number; z: number; o: number }[] = [];
    const numStars = 400;
    const speed = 0.5;
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * w - w / 2,
        y: Math.random() * h - h / 2,
        z: Math.random() * w,
        o: Math.random() * 0.5 + 0.5,
      });
    }

    const draw = () => {
      ctx.fillStyle = '#030304';
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      for (let i = 0; i < numStars; i++) {
        const star = stars[i];
        star.z -= speed;
        if (star.z <= 0) {
          star.z = w;
          star.x = Math.random() * w - w / 2;
          star.y = Math.random() * h - h / 2;
        }
        const x = (star.x / star.z) * w;
        const y = (star.y / star.z) * h;
        const size = (1 - star.z / w) * 3;
        const opacity = (1 - star.z / w) * star.o;
        ctx.beginPath();
        ctx.fillStyle =
          i % 6 === 0 ? `rgba(56, 189, 248, ${opacity * 0.55})` : `rgba(200, 210, 220, ${opacity * 0.42})`;
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      animationFrameId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      window.removeEventListener('resize', setCanvasSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none"
      style={{ background: 'transparent' }}
    />
  );
};
