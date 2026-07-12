import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeDesign, type AnalyzeResponse } from "@/lib/analyze.functions";

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

type Result = Extract<AnalyzeResponse, { ok: true }>["result"];

const SECTION_META: { key: keyof Result; title: string }[] = [
  { key: "visual_hierarchy", title: "Visual Hierarchy" },
  { key: "spacing_alignment", title: "Spacing & Alignment" },
  { key: "accessibility", title: "Accessibility" },
  { key: "cta_clarity", title: "CTA Clarity" },
  { key: "cognitive_load", title: "Cognitive Load" },
  { key: "visual_balance", title: "Visual Balance" },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const comma = dataUrl.indexOf(",");
      resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function Index() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const analyze = useServerFn(analyzeDesign);

  const loadFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) return;
    const url = URL.createObjectURL(f);
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setFile(f);
    setFileName(f.name);
    setStatus("idle");
    setResult(null);
    setErrorMsg(null);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) loadFile(f);
  };

  const runAnalyze = async () => {
    if (!file) return;
    setStatus("loading");
    setErrorMsg(null);
    try {
      const imageBase64 = await fileToBase64(file);
      const res = await analyze({ data: { imageBase64, mediaType: file.type || "image/png" } });
      if (res.ok) {
        setResult(res.result);
        setStatus("done");
      } else {
        setErrorMsg(res.error);
        setStatus("error");
      }
    } catch (e) {
      setErrorMsg((e as Error).message);
      setStatus("error");
    }
  };

  const reset = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setFile(null);
    setFileName(null);
    setStatus("idle");
    setResult(null);
    setErrorMsg(null);
  };

  const exportMarkdown = async () => {
    if (!result) return;
    const md = [
      "# DesignCritic Report",
      "",
      fileName ? `**File:** ${fileName}` : null,
      "",
      ...SECTION_META.flatMap((s) => [`## ${s.title}`, "", result[s.key] as string, ""]),
      `## Confidence Score`,
      "",
      `**${result.confidence_score.toFixed(1)}/10**`,
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

  const scorePct = result ? (result.confidence_score / 10) * 100 : 0;

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
                const f = e.target.files?.[0];
                if (f) loadFile(f);
              }}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {status === "done" ? "Analysis complete" : "Ready for analysis"}
                </p>
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
                  onClick={runAnalyze}
                  disabled={status === "loading"}
                  className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {status === "loading" ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background/40 border-t-background" />
                      Analyzing…
                    </>
                  ) : status === "error" ? (
                    "Retry Analysis"
                  ) : (
                    "Analyze Design"
                  )}
                </button>
              </div>
            )}
          </div>
        )}

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

        {status === "error" && errorMsg && (
          <div className="mt-10 rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">
            <p className="font-medium">Analysis failed</p>
            <p className="mt-1 text-destructive/90">{errorMsg}</p>
          </div>
        )}

        {status === "done" && result && (
          <section className="mt-12">
            <div className="mb-6 flex items-end justify-between border-b border-border pb-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Report</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">Design Critique</h2>
              </div>
              <span className="text-xs text-muted-foreground">6 dimensions analyzed</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {SECTION_META.map((s, i) => (
                <article
                  key={s.key}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold tracking-tight">{s.title}</h3>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {result[s.key] as string}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Confidence Score
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">
                    {result.confidence_score.toFixed(1)}
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
          DesignCritic · Powered by Claude.
        </div>
      </footer>
    </div>
  );
}
