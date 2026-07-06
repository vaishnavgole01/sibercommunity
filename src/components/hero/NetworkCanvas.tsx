"use client";

import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pulse: number;
  live: boolean;
}

export default function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    let animationFrame = 0;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const mouse = {
      x: -9999,
      y: -9999,
    };

    let nodes: Node[] = [];

    const createNodes = () => {
      nodes = [];

      const count = Math.min(
        90,
        Math.floor((window.innerWidth * window.innerHeight) / 18000)
      );

      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          radius: Math.random() * 1.5 + 0.5,
          pulse: Math.random() * Math.PI * 2,
          live: Math.random() < 0.15,
        });
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;

      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      createNodes();
    };

    const animate = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Update Nodes
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;
        node.pulse += 0.02;

        if (node.x < 0 || node.x > window.innerWidth) node.vx *= -1;
        if (node.y < 0 || node.y > window.innerHeight) node.vy *= -1;
      });

      // Draw Connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;

          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);

            ctx.strokeStyle = `rgba(200,255,58,${
              (1 - dist / 150) * 0.14
            })`;

            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // Draw Nodes
      nodes.forEach((node) => {
        const dx = mouse.x - node.x;
        const dy = mouse.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (node.live) {
          const pulseRadius = Math.sin(node.pulse) * 2 + 4;

          ctx.beginPath();
          ctx.fillStyle = "rgba(200,255,58,.14)";
          ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.fillStyle = "#c8ff3a";
          ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.fillStyle =
            dist < 180
              ? "rgba(255,255,255,.75)"
              : "rgba(255,255,255,.25)";

          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        if (dist < 180) {
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(mouse.x, mouse.y);

          ctx.strokeStyle = `rgba(200,255,58,${
            (1 - dist / 180) * 0.45
          })`;

          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      });

      // Mouse Glow
      const glow = ctx.createRadialGradient(
        mouse.x,
        mouse.y,
        0,
        mouse.x,
        mouse.y,
        180
      );

      glow.addColorStop(0, "rgba(200,255,58,.08)");
      glow.addColorStop(1, "rgba(200,255,58,0)");

      ctx.fillStyle = glow;
      ctx.fillRect(
        0,
        0,
        window.innerWidth,
        window.innerHeight
      );

      animationFrame = requestAnimationFrame(animate);
    };

    const handleMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    resize();
    animate();

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseleave", handleLeave);

    return () => {
      cancelAnimationFrame(animationFrame);

      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-10 pointer-events-none"
    />
  );
}