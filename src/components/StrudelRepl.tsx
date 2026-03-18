"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// Track all AudioContext instances so we can resume them on user gesture.
// Needed because superdough has a bug where AudioContext.resume() is never called.
const trackedContexts: AudioContext[] = [];
if (typeof window !== "undefined") {
  const Orig = window.AudioContext;
  window.AudioContext = class extends Orig {
    constructor(
      ...args: ConstructorParameters<typeof AudioContext>
    ) {
      super(...args);
      trackedContexts.push(this);
    }
  } as typeof AudioContext;
}

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
const modLabel = isMac ? "Cmd" : "Ctrl";

const DEFAULT_CODE = `// Welcome to Strudel AI!
// Press play or hit ${isMac ? "Cmd" : "Ctrl"}+Enter to start

note("c2 [e3 g3] c2 [g3 b3]")
.sound("sawtooth")
.lpf(800)
.decay(.15)
.sustain(0)`;

export type SampleLoadingState = "loading" | "ready" | "error";

export default function StrudelRepl({
  onSamplesLoaded,
  lastCodeFromAi,
}: {
  onSamplesLoaded?: (state: SampleLoadingState, sounds: string[]) => void;
  lastCodeFromAi?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const replRef = useRef<HTMLElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [sampleState, setSampleState] = useState<SampleLoadingState>("loading");
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  useEffect(() => {
    // Shim AudioWorkletNode for insecure contexts (non-HTTPS, non-localhost)
    // where the Web Audio AudioWorklet API is unavailable.
    // This lets superdough fall back to passthrough nodes instead of crashing.
    if (typeof window !== "undefined" && typeof AudioWorkletNode === "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).AudioWorkletNode = class AudioWorkletNodeShim {
        // Return a GainNode passthrough with a fake parameters map
        constructor(context: AudioContext, _name: string, _options?: unknown) {
          const gain = context.createGain();
          const paramMap = new Map<string, { value: number }>();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (gain as any).parameters = {
            get: (key: string) => {
              if (!paramMap.has(key)) paramMap.set(key, { value: 0 });
              return paramMap.get(key)!;
            },
          };
          return gain as unknown as AudioWorkletNodeShim;
        }
      };
    }

    // Dynamically import strudel repl (web component, must be client-side)
    import("@strudel/repl").then(async () => {
      if (!containerRef.current || replRef.current) return;

      const editor = document.createElement("strudel-editor");
      editor.setAttribute("code", DEFAULT_CODE);
      replRef.current = editor;
      containerRef.current.appendChild(editor);

      // Listen for play/stop state changes from the strudel editor
      editor.addEventListener("update", ((e: CustomEvent) => {
        if (typeof e.detail?.started === "boolean") {
          setPlaying(e.detail.started);
        }
      }) as EventListener);

      // Track prebake (sample loading) completion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const strudelEditor = editor as any;
      // Wait for the editor to initialize (connectedCallback runs async)
      await new Promise((r) => setTimeout(r, 100));
      const prebaked = strudelEditor.editor?.prebaked;
      if (prebaked && typeof prebaked.then === "function") {
        prebaked
          .then(() => {
            setSampleState("ready");
            setSampleError(null);
            // Get loaded sound names from superdough's soundMap
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            import("superdough" as any).then((mod: any) => {
              const sounds = mod.soundMap ? Object.keys(mod.soundMap.get()) : [];
              onSamplesLoaded?.("ready", sounds);
            }).catch(() => {
              onSamplesLoaded?.("ready", []);
            });
          })
          .catch((err: Error) => {
            const msg = err?.message || "Failed to load sample banks";
            setSampleState("error");
            setSampleError(msg);
            onSamplesLoaded?.("error", []);
          });
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Global keyboard shortcut: Ctrl+Enter (or Cmd+Enter on macOS) to evaluate/play,
  // Ctrl+. (or Cmd+. on macOS) to stop. Uses capture phase + stopPropagation so
  // our handler fires BEFORE the strudel editor's internal CodeMirror keybinding,
  // which would otherwise toggle (stop if playing) instead of re-evaluating.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        // Resume any suspended AudioContexts (same workaround as handleToggle)
        for (const ac of trackedContexts) {
          if (ac.state === "suspended") ac.resume().catch(() => {});
        }
        document.dispatchEvent(new CustomEvent("repl-evaluate"));
      } else if (e.key === ".") {
        e.preventDefault();
        e.stopPropagation();
        document.dispatchEvent(new CustomEvent("repl-stop"));
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, []);

  // Listen for strudel log events to surface errors (parse errors, sound not found, etc.)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const msg = detail?.message ?? "";

      let hint: string | null = null;
      const aiLabel = lastCodeFromAi ? " (in AI-generated code)" : "";

      // Parse errors from mini-notation or JS evaluation
      if (/parse error/i.test(msg) || /\[mini\]/i.test(msg)) {
        // Extract a concise description from the error
        const lineMatch = msg.match(/line (\d+)/);
        const lineInfo = lineMatch ? ` on line ${lineMatch[1]}` : "";
        hint = `Parse error${lineInfo}${aiLabel}: ${msg.length > 200 ? msg.slice(0, 200) + "…" : msg}`;
      }
      // Reference errors, type errors, syntax errors from code evaluation
      else if (/ReferenceError|TypeError|SyntaxError/i.test(msg)) {
        hint = `Code error${aiLabel}: ${msg.length > 200 ? msg.slice(0, 200) + "…" : msg}`;
      }
      // Sound not found errors
      else if (/sound (.+?) not found/.test(msg)) {
        const match = msg.match(/sound (.+?) not found/)!;
        const name = match[1];
        if (sampleState === "loading") {
          hint = `Sound "${name}" not found${aiLabel}. Sample banks are still loading — try again in a moment.`;
        } else if (/^[A-Z]/.test(name) || /\d{2,}/.test(name)) {
          hint = `"${name}" is a drum machine bank, not a sound name${aiLabel}. Use: s("bd sd hh cp").bank("${name}")`;
        } else {
          hint = `Sound "${name}" not found${aiLabel}. Try a built-in synth (sawtooth, square, triangle, sine) or check the name.`;
        }
      }
      // Catch-all for other error-level messages
      else if (detail?.type === "error" || /\berror\b/i.test(msg)) {
        hint = `Error${aiLabel}: ${msg.length > 200 ? msg.slice(0, 200) + "…" : msg}`;
      }

      if (hint) {
        setErrorToast(hint);
        setTimeout(() => setErrorToast(null), 10000);
      }
    };
    document.addEventListener("strudel.log", handler);
    return () => document.removeEventListener("strudel.log", handler);
  }, [sampleState, lastCodeFromAi]);

  const handleToggle = useCallback(async () => {
    // Work around superdough bug: AudioContext.resume() is never called
    // due to operator precedence issue in initAudio() — (!audioCtx) instanceof OfflineAudioContext
    // is always false, so resume() is skipped. We resume all tracked contexts here.
    for (const ac of trackedContexts) {
      if (ac.state === "suspended") {
        try {
          await ac.resume();
        } catch {
          // ignore
        }
      }
    }
    const el = replRef.current as HTMLElement & { editor?: { toggle: () => void } };
    el?.editor?.toggle();
  }, []);

  const handleStop = useCallback(() => {
    const el = replRef.current as HTMLElement & { editor?: { stop: () => void } };
    el?.editor?.stop();
  }, []);

  return (
    <div className="h-full w-full flex flex-col">
      {/* Toolbar with play/stop controls */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0"
        style={{
          background: "var(--panel-bg)",
          borderBottom: "1px solid var(--panel-border)",
        }}
      >
        <button
          onClick={handleToggle}
          className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors"
          style={{
            background: playing ? "#dc2626" : "#16a34a",
            color: "#fff",
          }}
          title={playing ? `Stop (${modLabel}+.)` : `Play (${modLabel}+Enter)`}
        >
          {playing ? (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <rect x="2" y="2" width="8" height="8" rx="1" />
              </svg>
              Stop
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M3 1.5v9l7.5-4.5L3 1.5z" />
              </svg>
              Play
            </>
          )}
        </button>
        {playing ? (
          <span className="text-xs flex items-center gap-2" style={{ color: "#666" }}>
            Playing...
            <kbd
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#aaa",
              }}
            >
              {modLabel}+. to stop
            </kbd>
          </span>
        ) : (
          <kbd
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium animate-pulse"
            style={{
              background: "rgba(22,163,106,0.12)",
              border: "1px solid rgba(22,163,106,0.3)",
              color: "#16a36a",
            }}
          >
            {modLabel}+Enter to play
          </kbd>
        )}

        {/* Sample loading indicator */}
        <span className="text-xs ml-auto" style={{
          color: sampleState === "loading" ? "#ca8a04" : sampleState === "error" ? "#dc2626" : "#16a34a",
        }}>
          {sampleState === "loading" && (
            <>
              <span className="inline-block animate-pulse">Loading samples...</span>
            </>
          )}
          {sampleState === "error" && (
            <span title={sampleError || undefined}>
              Sample loading failed
            </span>
          )}
          {sampleState === "ready" && "Samples ready"}
        </span>
      </div>

      {/* Error toast for evaluation errors */}
      {errorToast && (
        <div
          className="px-3 py-1.5 text-xs flex-shrink-0 flex items-start gap-2"
          style={{
            background: "#fef2f2",
            color: "#991b1b",
            borderBottom: "1px solid #fecaca",
          }}
        >
          <span className="flex-1">{errorToast}</span>
          <button
            onClick={() => setErrorToast(null)}
            className="opacity-60 hover:opacity-100 cursor-pointer flex-shrink-0"
            style={{ color: "#991b1b" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Editor container */}
      <div ref={containerRef} className="flex-1 min-h-0 overflow-auto" />
    </div>
  );
}

export function getStrudelCode(replElement: HTMLElement | null): string {
  if (!replElement) return "";
  // @ts-expect-error strudel-editor custom element
  return replElement.editor?.getCode?.() ?? "";
}

export function setStrudelCode(
  replElement: HTMLElement | null,
  code: string
): void {
  if (!replElement) return;
  replElement.setAttribute("code", code);
}
