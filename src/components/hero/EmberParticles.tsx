"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Ember {
  id: number;
  left: number;
  size: number;
  duration: number;
  drift: number;
  color: string;
}

const COLORS = [
  "#ff5e3a",
  "#ffb800",
  "#ff8ab8",
];

export default function EmberParticles() {
  const [embers, setEmbers] = useState<Ember[]>([]);

  useEffect(() => {
    let id = 0;

    const interval = setInterval(() => {
      const color =
        COLORS[Math.floor(Math.random() * COLORS.length)];

      const ember: Ember = {
        id: id++,
        left: Math.random() * 100,
        size: 2 + Math.random() * 4,
        duration: 4 + Math.random() * 4,
        drift: (Math.random() - 0.5) * 180,
        color,
      };

      setEmbers((prev) => [...prev, ember]);

      setTimeout(() => {
        setEmbers((prev) =>
          prev.filter((e) => e.id !== ember.id)
        );
      }, ember.duration * 1000);

    }, 350);

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
            scale: 0.5,
          }}
          animate={{
            x: ember.drift,
            y: -window.innerHeight,
            opacity: [0, 1, 0.8, 0],
            scale: [0.5, 1],
          }}
          transition={{
            duration: ember.duration,
            ease: "easeOut",
          }}
          style={{
            left: `${ember.left}%`,
            bottom: 0,
            width: ember.size,
            height: ember.size,
            background: ember.color,
            boxShadow: `0 0 ${ember.size * 4}px ${ember.color}`,
          }}
          className="absolute rounded-full"
        />
      ))}

    </div>
  );
}