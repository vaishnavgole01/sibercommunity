"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  tx: number;
  ty: number;
  size: number;
  speed: number;
}

export default function IntroParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;

    const ctx = canvas.getContext("2d")!;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let animationFrame = 0;

    let particles: Particle[] = [];

    function resize() {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;

      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      createParticles();
    }

    function createParticles() {
      particles = [];

      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;

      for (let i = 0; i < 450; i++) {
        const angle = Math.random() * Math.PI * 2;

        const radius = 250 + Math.random() * 700;

        particles.push({
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,

          tx: cx,
          ty: cy,

          size: Math.random() * 2 + 0.8,

          speed: 0.01 + Math.random() * 0.02,
        });
      }
    }

    let frame = 0;

    function animate() {
      frame++;

      ctx.clearRect(
        0,
        0,
        window.innerWidth,
        window.innerHeight
      );

      particles.forEach((p) => {
        p.x += (p.tx - p.x) * p.speed;
        p.y += (p.ty - p.y) * p.speed;

        ctx.beginPath();

        ctx.fillStyle = `rgba(200,255,58,${
          0.25 + Math.sin(frame * 0.03) * 0.15
        })`;

        ctx.shadowBlur = 10;
        ctx.shadowColor = "#c8ff3a";

        ctx.arc(
          p.x,
          p.y,
          p.size,
          0,
          Math.PI * 2
        );

        ctx.fill();
      });

      animationFrame = requestAnimationFrame(animate);
    }

    resize();

    animate();

    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationFrame);

      window.removeEventListener(
        "resize",
        resize
      );
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="
        absolute
        inset-0
        z-0
        pointer-events-none
      "
    />
  );
}