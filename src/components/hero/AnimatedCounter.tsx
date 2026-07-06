"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  end: number;
  suffix?: string;
  decimals?: number;
  duration?: number;
}

export default function AnimatedCounter({
  end,
  suffix = "",
  decimals = 0,
  duration = 1800,
}: AnimatedCounterProps) {
  const [value, setValue] = useState(0);

  const started = useRef(false);

  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;

        started.current = true;

        const start = performance.now();

        function animate(now: number) {
          const progress = Math.min((now - start) / duration, 1);

          const eased = 1 - Math.pow(1 - progress, 3);

          setValue(end * eased);

          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        }

        requestAnimationFrame(animate);
      },
      {
        threshold: 0.5,
      }
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, [duration, end]);

  return (
    <span ref={ref}>
      {decimals
        ? value.toFixed(decimals)
        : Math.floor(value).toLocaleString()}
      {suffix}
    </span>
  );
}