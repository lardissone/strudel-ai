"use client";

import { useState, useMemo } from "react";
import { reference } from "@strudel/reference";

interface DocEntry {
  name: string;
  description?: string;
  params?: { name: string; type?: { names: string[] }; description?: string }[];
  examples?: string[];
  synonyms?: string[];
  meta?: { filename?: string; path?: string };
  memberof?: string;
}

type Category = {
  label: string;
  entries: DocEntry[];
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function categorize(docs: DocEntry[]): Category[] {
  const categories: Record<string, DocEntry[]> = {
    "Pattern Transformations": [],
    "Controls & Effects": [],
    "Signals": [],
    "Scales & Notes": [],
    "Audio Engine": [],
    "Visualization": [],
    "MIDI & I/O": [],
    "Other": [],
  };

  for (const entry of docs) {
    if (!entry.name || entry.name.startsWith("_")) continue;
    const pkg = entry.meta?.path?.split("/").pop() || "";
    const file = entry.meta?.filename || "";

    if (pkg === "tonal") {
      categories["Scales & Notes"].push(entry);
    } else if (file === "pattern.mjs" || file === "euclid.mjs" || file === "pick.mjs" || file === "repl.mjs") {
      categories["Pattern Transformations"].push(entry);
    } else if (file === "signal.mjs") {
      categories["Signals"].push(entry);
    } else if (file === "controls.mjs" || pkg === "supradough") {
      categories["Controls & Effects"].push(entry);
    } else if (pkg === "superdough") {
      categories["Audio Engine"].push(entry);
    } else if (pkg === "draw" || pkg === "webaudio" || pkg === "codemirror") {
      categories["Visualization"].push(entry);
    } else if (pkg === "midi" || pkg === "osc" || pkg === "motion" || pkg === "csound") {
      categories["MIDI & I/O"].push(entry);
    } else {
      categories["Other"].push(entry);
    }
  }

  return Object.entries(categories)
    .filter(([, entries]) => entries.length > 0)
    .map(([label, entries]) => ({
      label,
      entries: entries.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

function FunctionEntry({ entry, onExampleClick }: { entry: DocEntry; onExampleClick?: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const desc = entry.description ? stripHtml(entry.description) : "";

  return (
    <li className="text-xs">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left flex items-start gap-1 py-0.5 cursor-pointer hover:bg-white/5 rounded px-1"
      >
        <span className="opacity-40 text-[10px] mt-0.5 shrink-0">{open ? "▾" : "▸"}</span>
        <span>
          <code className="text-purple-400">
            {entry.memberof ? "." : ""}
            {entry.name}
            {entry.params && entry.params.length > 0
              ? `(${entry.params.map((p) => p.name).join(", ")})`
              : "()"}
          </code>
          {desc && !open && (
            <span className="opacity-50 ml-1">
              – {desc.length > 60 ? desc.slice(0, 57) + "…" : desc}
            </span>
          )}
        </span>
      </button>
      {open && (
        <div className="ml-4 pl-2 py-1 border-l" style={{ borderColor: "var(--panel-border)" }}>
          {desc && <p className="opacity-70 mb-1">{desc}</p>}
          {entry.synonyms && entry.synonyms.length > 0 && (
            <p className="opacity-50 mb-1">
              Aliases: {entry.synonyms.map((s) => <code key={s} className="text-purple-300 mr-1">{s}</code>)}
            </p>
          )}
          {entry.params && entry.params.length > 0 && (
            <div className="mb-1">
              <span className="font-semibold opacity-60">Params:</span>
              <ul className="list-none p-0 ml-2">
                {entry.params.map((p, i) => (
                  <li key={`${p.name}-${i}`}>
                    <code className="text-purple-300">{p.name}</code>
                    {p.type && (
                      <span className="opacity-40 ml-1">
                        : {p.type.names.join(" | ")}
                      </span>
                    )}
                    {p.description && (
                      <span className="opacity-50 ml-1">– {stripHtml(p.description)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {entry.examples && entry.examples.length > 0 && (
            <div>
              <span className="font-semibold opacity-60">Examples:</span>
              {entry.examples.map((ex, i) => (
                <pre
                  key={i}
                  onClick={() => onExampleClick?.(ex)}
                  className="group mt-0.5 p-1.5 rounded text-[10px] leading-snug overflow-x-auto font-mono text-purple-200 cursor-pointer transition-colors hover:bg-purple-500/20 relative"
                  style={{ background: "rgba(0,0,0,0.3)" }}
                  title="Click to load in REPL"
                >
                  <span className="absolute top-1 right-1 opacity-0 group-hover:opacity-70 text-[10px] transition-opacity">
                    ▶
                  </span>
                  {ex}
                </pre>
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

const miniNotationRows = [
  ["a b", "Sequence"],
  ["a b c d", "Even subdivision"],
  ["[a b]", "Group"],
  ["a*3", "Repeat 3x"],
  ["a/3", "Slow down 3x"],
  ["a!3", "Replicate 3x"],
  ["<a b c>", "Alternate each cycle"],
  ["a?", "Remove randomly (50%)"],
  ["~", "Rest / silence"],
  ["a@3", "Elongate 3 steps"],
  ["a,b", "Play together (stack)"],
  ["{a b c}%4", "Polymeter"],
];

export default function DocsSidebar({
  collapsed,
  onToggle,
  onExampleClick,
  fullWidth,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onExampleClick?: (code: string) => void;
  fullWidth?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set(["Pattern Transformations", "Controls & Effects"])
  );
  const [miniNotationOpen, setMiniNotationOpen] = useState(true);

  const allCategories = useMemo(() => categorize(reference.docs as DocEntry[]), []);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return allCategories;
    const q = search.toLowerCase();
    return allCategories
      .map((cat) => ({
        ...cat,
        entries: cat.entries.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.synonyms?.some((s) => s.toLowerCase().includes(q)) ||
            (e.description && stripHtml(e.description).toLowerCase().includes(q))
        ),
      }))
      .filter((cat) => cat.entries.length > 0);
  }, [search, allCategories]);

  function toggleCategory(label: string) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  if (collapsed) {
    return (
      <div
        className="flex flex-col items-center py-3 cursor-pointer"
        style={{ background: "var(--panel-bg)", width: 36 }}
        onClick={onToggle}
      >
        <span className="text-sm" title="Show docs">
          📖
        </span>
        <span
          className="text-xs mt-1 writing-mode-vertical"
          style={{ writingMode: "vertical-rl" }}
        >
          Docs
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: "var(--panel-bg)", width: fullWidth ? "100%" : 280 }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 text-sm font-semibold border-b flex items-center justify-between"
        style={{ borderColor: "var(--panel-border)" }}
      >
        <span className="flex items-center gap-2">
          <span>📖</span> Strudel Docs
        </span>
        <button
          onClick={onToggle}
          className="text-xs opacity-50 hover:opacity-100 cursor-pointer"
          title="Collapse docs"
        >
          ◀
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b" style={{ borderColor: "var(--panel-border)" }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search functions…"
          className="w-full text-xs px-2 py-1.5 rounded border-none outline-none"
          style={{
            background: "rgba(255,255,255,0.06)",
            color: "inherit",
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Mini-Notation Quick Reference (always shown, not affected by search) */}
        {!search.trim() && (
          <div>
            <button
              onClick={() => setMiniNotationOpen(!miniNotationOpen)}
              className="w-full text-left text-xs font-semibold py-1.5 px-2 rounded hover:bg-white/5 flex items-center justify-between cursor-pointer"
            >
              Mini-Notation Quick Reference
              <span className="opacity-50">{miniNotationOpen ? "▾" : "▸"}</span>
            </button>
            {miniNotationOpen && (
              <div className="px-2 py-2">
                <table className="w-full text-xs">
                  <tbody>
                    {miniNotationRows.map(([notation, desc]) => (
                      <tr
                        key={notation}
                        className="border-b"
                        style={{ borderColor: "var(--panel-border)" }}
                      >
                        <td className="py-1 pr-2 font-mono text-purple-400">{notation}</td>
                        <td className="py-1 opacity-70">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Function reference categories */}
        {filteredCategories.map((cat) => (
          <div key={cat.label}>
            <button
              onClick={() => toggleCategory(cat.label)}
              className="w-full text-left text-xs font-semibold py-1.5 px-2 rounded hover:bg-white/5 flex items-center justify-between cursor-pointer"
            >
              <span>
                {cat.label}{" "}
                <span className="opacity-40 font-normal">({cat.entries.length})</span>
              </span>
              <span className="opacity-50">
                {openCategories.has(cat.label) || search.trim() ? "▾" : "▸"}
              </span>
            </button>
            {(openCategories.has(cat.label) || search.trim()) && (
              <ul className="list-none p-0 space-y-0.5 mt-1">
                {cat.entries.map((entry, i) => (
                  <FunctionEntry key={`${entry.name}-${entry.memberof ?? ''}-${i}`} entry={entry} onExampleClick={onExampleClick} />
                ))}
              </ul>
            )}
          </div>
        ))}

        {search.trim() && filteredCategories.length === 0 && (
          <p className="text-xs opacity-50 text-center py-4">
            No functions matching &ldquo;{search}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}
