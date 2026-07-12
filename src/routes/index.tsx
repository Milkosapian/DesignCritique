import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DesignCritic — UI/UX Design Critique" },
      {
        name: "description",
        content:
          "Upload a UI screenshot and get a structured design critique across hierarchy, spacing, accessibility, and more.",
      },
      { property: "og:title", content: "DesignCritic — UI/UX Design Critique" },
      {
        property: "og:description",
        content: "Structured design critiques for your UI screenshots.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Section = { title: string; body: string };

const SECTIONS: Section[] = [
  {
    title: "Visual Hierarchy",
    body: "The primary CTA has strong visual weight, but secondary actions compete for attention due to similar sizing. Consider reducing the visual prominence of tertiary elements.",
  },
  {
    title: "Spacing & Alignment",
    body: "Spacing is mostly consistent, but the padding between the header and content block feels tight at 8px. Recommend increasing to 16–24px for better breathing room.",
  },
  {
    title: "Accessibility",
    body: "Text contrast on the muted gray labels may fall below WCAG AA standards. Verify contrast ratio is at least 4.5:1 for body text.",
  },
  {
    title: "CTA Clarity",
    body: "The primary button uses clear action language, but its placement below the fold may reduce discoverability. Consider moving it above the scroll line.",
  },
  {
    title: "Cognitive Load",
    body: "The interface presents 7 distinct interactive elements in the initial view. Consider progressive disclosure to reduce initial decision fatigue.",
  },
  {
    title: "Visual Balance",
    body: "The layout leans heavily left-weighted. Introducing an element on the right side, or adjusting the grid, would improve overall symmetry.",
  },
];

const SCORE = 7.5;

function Index() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setFileName(file.name);
    setStatus("idle");
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  const analyze = () => {
    setStatus("loading");
    setTimeout(() => setStatus("done"), 2000);
  };

  const reset = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setFileName(null);
    setStatus("idle");
  };

  const exportMarkdown = async () => {
    const md = [
      "# DesignCritic Report",
      "",
      fileName ? `**File:** ${fileName}` : null,
      "",
      ...SECTIONS.flatMap((s) => [`## ${s.title}`, "", s.body, ""]),
      `## Confidence Score`,
      "",
      `**${SCORE}/10**`,
      "",
    ]
      .filter((l) => l !== null)
      .join("\n");
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const scorePct = (SCORE / 10) * 100;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md border border-border bg-card grid place-items-center">
              <div className="h-2 w-2 rounded-sm bg-foreground" />
            </div>
            <span className="text-sm font-medium tracking-tight">DesignCritic</span>
          </div>
          <span className="text-xs text-muted-foreground">UI/UX critique, structured.</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight">Get a structured critique of your design.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload a UI screenshot or Figma export. DesignCritic reviews hierarchy, spacing,
            accessibility, and more.
          </p>
        </div>

        {/* Upload zone */}
        {!imageUrl ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={[
              "cursor-pointer rounded-xl border border-dashed transition-colors",
              "flex flex-col items-center justify-center px-6 py-20 text-center",
              dragOver
                ? "border-foreground/50 bg-muted/40"
                : "border-border bg-card hover:bg-muted/30",
            ].join(" ")}
          >
            <div className="mb-4 grid h-10 w-10 place-items-center rounded-md border border-border bg-background">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3v12" />
                <path d="m7 8 5-5 5 5" />
                <path d="M5 21h14" />
              </svg>
            </div>
            <p className="text-sm font-medium">Drop an image, or click to upload</p>
            <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, or WEBP · single file</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) loadFile(file);
              }}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{fileName}</p>
                <p className="text-xs text-muted-foreground">Ready for analysis</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={reset}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Replace
                </button>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center rounded-lg border border-border bg-background p-4">
              <img
                src={imageUrl}
                alt="Uploaded design preview"
                className="max-h-[420px] w-auto rounded-md object-contain"
              />
            </div>

            {status !== "done" && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={analyze}
                  disabled={status === "loading"}
                  className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {status === "loading" ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background/40 border-t-background" />
                      Analyzing…
                    </>
                  ) : (
                    "Analyze Design"
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Loading skeleton */}
        {status === "loading" && (
          <div className="mt-10 space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border border-border bg-card"
              />
            ))}
          </div>
        )}

        {/* Report */}
        {status === "done" && (
          <section className="mt-12">
            <div className="mb-6 flex items-end justify-between border-b border-border pb-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Report</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">Design Critique</h2>
              </div>
              <span className="text-xs text-muted-foreground">6 dimensions analyzed</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {SECTIONS.map((s, i) => (
                <article
                  key={s.title}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold tracking-tight">{s.title}</h3>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </article>
              ))}
            </div>

            {/* Score */}
            <div className="mt-6 rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Confidence Score
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">
                    {SCORE.toFixed(1)}
                    <span className="text-base font-normal text-muted-foreground"> / 10</span>
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">Overall quality</div>
              </div>
              <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground transition-all"
                  style={{ width: `${scorePct}%` }}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={exportMarkdown}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                {copied ? "Copied to clipboard" : "Export as Markdown"}
              </button>
            </div>
          </section>
        )}
      </main>

      <footer className="mt-16 border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-6 text-xs text-muted-foreground">
          DesignCritic · Placeholder analysis. AI backend coming soon.
        </div>
      </footer>
    </div>
  );
}
