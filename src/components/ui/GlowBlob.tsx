"use client";

interface GlowBlobProps {
  size: number;
  color: string;

  className?: string;

  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
}

export default function GlowBlob({
  size,
  color,
  className = "",

  top,
  left,
  right,
  bottom,
}: GlowBlobProps) {
  return (
    <div
      className={`absolute pointer-events-none rounded-full blur-[120px] ${className}`}
      style={{
        width: size,
        height: size,
        background: color,

        top,
        left,
        right,
        bottom,
      }}
    />
  );
}