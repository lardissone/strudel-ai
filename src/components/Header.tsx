"use client";

import { useState } from "react";
import AboutModal from "./AboutModal";

export default function Header() {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <>
      <header
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{
          background: "var(--panel-bg)",
          borderColor: "var(--panel-border)",
        }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold tracking-tight">
            🎵 Strudel AI
          </h1>
          <span className="text-xs opacity-40 hidden sm:inline">Live coding with AI assistant</span>
        </div>
        <button
          onClick={() => setAboutOpen(true)}
          className="text-xs opacity-50 hover:opacity-100 cursor-pointer"
          style={{ background: "none", border: "none", color: "var(--foreground)" }}
        >
          About
        </button>
      </header>
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  );
}
