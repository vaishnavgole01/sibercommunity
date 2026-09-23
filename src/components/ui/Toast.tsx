"use client";

import { createPortal } from "react-dom";

type ToastProps = {
  message: string;
  visible: boolean;
};

export default function Toast({ message, visible }: ToastProps) {
  if (!visible || !message || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      style={{ position: "fixed", right: 24, bottom: 24, zIndex: 99999 }}
      className="max-w-sm rounded-3xl border border-lime-200/20 bg-lime-300/10 px-4 py-3 shadow-2xl backdrop-blur-xl text-white"
    >
      <div className="text-sm font-semibold text-lime-200">Coming soon</div>
      <p className="mt-1 text-sm text-lime-100">{message}</p>
    </div>,
    document.body
  );
}
