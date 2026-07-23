"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Ember {
  id: number;
  left: number;
  width: number;
  height: number;
  duration: number;
  drift: number;
  color: string;
  borderRadius: string;
}

const COLORS = [
  "#ffd86f",
  "#ff8f2b",
  "#ff4b12",
];

export default function EmberParticles() {
  const [embers, setEmbers] = useState<Ember[]>([]);

  useEffect(() => {
    let id = 0;

    const interval = setInterval(() => {
      const nextEmbers: Ember[] = [];

      for (let i = 0; i < 2; i += 1) {
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const width = 2 + Math.random() * 2.5;
        const height = width * (1.6 + Math.random() * 0.8);

        nextEmbers.push({
          id: id++,
          left: Math.min(100, Math.max(0, Math.random() * 100)),
          width,
          height,
          duration: 1.8 + Math.random() * 1.6,
          drift: (Math.random() - 0.5) * 60,
          color,
          borderRadius: `${55 + Math.random() * 15}% ${40 + Math.random() * 20}% ${65 + Math.random() * 10}% ${60 + Math.random() * 10}% / ${35 + Math.random() * 10}% ${50 + Math.random() * 15}% ${45 + Math.random() * 15}% ${60 + Math.random() * 10}%`,
        });
      }

      setEmbers((prev) => [...prev, ...nextEmbers]);

      nextEmbers.forEach((ember) => {
        setTimeout(() => {
          setEmbers((prev) =>
            prev.filter((e) => e.id !== ember.id)
          );
        }, ember.duration * 1000);
      });

    }, 260);

    return () => clearInterval(interval);

  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">

      {embers.map((ember) => (
        <motion.div
          key={ember.id}
          initial={{
            x: 0,
            y: 0,
            opacity: 0,
            scale: 0.4,
            rotate: 0,
          }}
          animate={{
            x: ember.drift,
            y: -window.innerHeight * 0.35,
            opacity: [0, 0.9, 0.65, 0],
            scale: [0.4, 0.85, 0.7],
            rotate: [0, 4, -2, 0],
            borderRadius: [
              ember.borderRadius,
              ember.borderRadius,
            ],
          }}
          transition={{
            duration: ember.duration,
            ease: "easeOut",
          }}
          style={{
            left: `${ember.left}%`,
            bottom: 20,
            width: ember.width,
            height: ember.height,
            background: ember.color,
            boxShadow: `0 0 ${ember.width * 3}px ${ember.color}`,
            filter: "brightness(1.15) blur(0.35px)",
          }}
          className="absolute"
        />
      ))}

    </div>
  );
}