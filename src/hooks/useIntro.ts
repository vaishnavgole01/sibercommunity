"use client";

import { useState } from "react";

export default function useIntro() {
  const [showIntro, setShowIntro] = useState(true);

  return {
    ready: true,
    showIntro,
    finishIntro: () => setShowIntro(false),
  };
}