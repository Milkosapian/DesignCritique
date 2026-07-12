import { createServerFn } from "@tanstack/react-start";

type AnalysisResult = {
  visual_hierarchy: string;
  spacing_alignment: string;
  accessibility: string;
  cta_clarity: string;
  cognitive_load: string;
  visual_balance: string;
  confidence_score: number;
};

export type AnalyzeResponse =
  | { ok: true; result: AnalysisResult }
  | { ok: false; error: string };

const SYSTEM_PROMPT = `You are a senior UX/UI design critic. You will be shown an image of a user interface — a screenshot, wireframe, or Figma export. Analyze it and return a structured critique.

You must respond in valid JSON matching this exact structure, with no text before or after the JSON:

{
  "visual_hierarchy": "2-3 sentence critique of visual hierarchy, weight distribution, and what draws the eye first",
  "spacing_alignment": "2-3 sentence critique of spacing, padding, and alignment consistency",
  "accessibility": "2-3 sentence critique of contrast, text sizing, and accessibility concerns",
  "cta_clarity": "2-3 sentence critique of call-to-action visibility, wording, and placement",
  "cognitive_load": "2-3 sentence critique of how many decisions/elements the user faces at once",
  "visual_balance": "2-3 sentence critique of overall composition and symmetry",
  "confidence_score": <a number from 1-10 representing overall design quality>
}

Rules:
- Be specific and reference what you actually see in the image — colors, button positions, text sizes
- Be constructive but honest — point out real issues, don't just praise
- Never say "looks clean" or "looks good" without a specific reason
- If the image is not a UI/UX design (e.g. a photo, a logo, random content), respond with: {"error": "This doesn't appear to be a UI design. Please upload a screenshot or design export."}`;

export const analyzeDesign = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const d = input as { imageBase64?: string; mediaType?: string };
    if (!d?.imageBase64 || typeof d.imageBase64 !== "string") {
      throw new Error("imageBase64 required");
    }
    const mediaType = d.mediaType && typeof d.mediaType === "string" ? d.mediaType : "image/png";
    return { imageBase64: d.imageBase64, mediaType };
  })
  .handler(async ({ data }): Promise<AnalyzeResponse> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { ok: false, error: "Server missing ANTHROPIC_API_KEY." };

    let res: Response;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: data.mediaType,
                    data: data.imageBase64,
                  },
                },
                { type: "text", text: "Analyze this design and return the JSON as specified." },
              ],
            },
          ],
        }),
      });
    } catch (e) {
      return { ok: false, error: `Network error contacting Claude: ${(e as Error).message}` };
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Claude API error ${res.status}: ${text.slice(0, 300)}` };
    }

    const payload = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = payload.content?.find((b) => b.type === "text")?.text ?? "";
    const jsonStr = extractJson(text);
    if (!jsonStr) return { ok: false, error: "Claude did not return JSON." };

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    } catch {
      return { ok: false, error: "Failed to parse Claude JSON response." };
    }

    if (typeof parsed.error === "string") {
      return { ok: false, error: parsed.error };
    }

    const required = [
      "visual_hierarchy",
      "spacing_alignment",
      "accessibility",
      "cta_clarity",
      "cognitive_load",
      "visual_balance",
    ] as const;
    for (const k of required) {
      if (typeof parsed[k] !== "string") {
        return { ok: false, error: `Response missing field: ${k}` };
      }
    }
    const score = Number(parsed.confidence_score);
    if (!Number.isFinite(score)) {
      return { ok: false, error: "Response missing confidence_score" };
    }

    return {
      ok: true,
      result: {
        visual_hierarchy: parsed.visual_hierarchy as string,
        spacing_alignment: parsed.spacing_alignment as string,
        accessibility: parsed.accessibility as string,
        cta_clarity: parsed.cta_clarity as string,
        cognitive_load: parsed.cognitive_load as string,
        visual_balance: parsed.visual_balance as string,
        confidence_score: Math.max(1, Math.min(10, score)),
      },
    };
  });

function extractJson(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) return trimmed.slice(start, end + 1);
  return null;
}
