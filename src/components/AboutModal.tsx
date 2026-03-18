"use client";

import { useEffect, useRef } from "react";

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AboutModal({ open, onClose }: AboutModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      style={{
        background: "var(--panel-bg)",
        color: "var(--foreground)",
        border: "1px solid var(--panel-border)",
        borderRadius: 12,
        padding: 0,
        maxWidth: 520,
        width: "90vw",
        maxHeight: "80vh",
        overflow: "auto",
      }}
    >
      <div style={{ padding: "1.5rem 2rem" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">About Strudel AI</h2>
          <button
            onClick={onClose}
            className="text-sm opacity-50 hover:opacity-100 cursor-pointer"
            style={{ background: "none", border: "none", color: "var(--foreground)" }}
          >
            ✕
          </button>
        </div>

        <section className="mb-5">
          <p className="text-sm leading-relaxed opacity-80">
            Strudel AI is a live-coding music environment with an integrated AI
            assistant. Write musical patterns using{" "}
            <a
              href="https://strudel.cc"
              target="_blank"
              rel="noopener noreferrer"
              className="about-link"
            >
              Strudel
            </a>
            &apos;s mini-notation, get help from AI, and hear your creations
            instantly in the browser.
          </p>
        </section>

        <section className="mb-5">
          <h3 className="text-sm font-bold mb-2 opacity-60 uppercase tracking-wide">
            Acknowledgments
          </h3>
          <p className="text-sm leading-relaxed opacity-80">
            This project is built on top of{" "}
            <a
              href="https://strudel.cc"
              target="_blank"
              rel="noopener noreferrer"
              className="about-link"
            >
              Strudel
            </a>
            , an incredible live coding platform created by{" "}
            <a
              href="https://github.com/felixroos"
              target="_blank"
              rel="noopener noreferrer"
              className="about-link"
            >
              Felix Roos
            </a>{" "}
            and the Strudel contributors. Strudel brings the power of{" "}
            <a
              href="https://tidalcycles.org"
              target="_blank"
              rel="noopener noreferrer"
              className="about-link"
            >
              Tidal Cycles
            </a>{" "}
            to the browser, making algorithmic music accessible to everyone.
            Huge thanks to the entire Strudel and Tidal community for their
            exceptional work and open-source spirit.
          </p>
        </section>

        <section className="mb-5">
          <h3 className="text-sm font-bold mb-2 opacity-60 uppercase tracking-wide">
            About the Creator
          </h3>
          <p className="text-sm leading-relaxed opacity-80">
            Strudel AI was created by{" "}
            <a
              href="https://leandroardissone.com"
              target="_blank"
              rel="noopener noreferrer"
              className="about-link"
            >
              Leandro Ardissone
            </a>{" "}
            as an experiment in combining AI-assisted coding with live music
            programming. The goal is to lower the barrier to entry for
            algorithmic music and make it easy for anyone to start creating
            patterns and sounds.
          </p>
          <p className="text-sm leading-relaxed opacity-80 mt-2">
            <a
              href="https://github.com/lardissone"
              target="_blank"
              rel="noopener noreferrer"
              className="about-link"
            >
              GitHub
            </a>
            {" · "}
            <a
              href="https://leandroardissone.com"
              target="_blank"
              rel="noopener noreferrer"
              className="about-link"
            >
              Website
            </a>
          </p>
        </section>

        <section>
          <h3 className="text-sm font-bold mb-2 opacity-60 uppercase tracking-wide">
            License & Source
          </h3>
          <p className="text-sm leading-relaxed opacity-80">
            Licensed under{" "}
            <a
              href="https://www.gnu.org/licenses/agpl-3.0.html"
              target="_blank"
              rel="noopener noreferrer"
              className="about-link"
            >
              AGPL-3.0
            </a>
            . Source code is available on{" "}
            <a
              href="https://github.com/lardissone/strudel-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="about-link"
            >
              GitHub
            </a>
            . Contributions and feedback are welcome.
          </p>
        </section>

        <div
          className="mt-6 pt-4 text-center text-xs opacity-40"
          style={{ borderTop: "1px solid var(--panel-border)" }}
        >
          Made with sound and code
        </div>
      </div>
    </dialog>
  );
}
