import { geminiGenerateText } from "../ai/gemini-client";

const SYSTEM = `You format draft blog articles into clean semantic HTML for Smart Refill WRS Blog.

Rules:
- Preserve the author's original wording exactly (including Tagalog). Do not rewrite, summarize, invent, or omit story content.
- Return ONLY an HTML fragment for the article body (no <html>, <body>, markdown fences, or commentary).
- Do NOT include the title or author byline — those are separate form fields.
- Structure:
  - First paragraph: <p class="lead">...</p>
  - Remaining narrative: <p>...</p>
  - Clear spoken dialogue / quoted lines: <blockquote><p>...</p></blockquote>
  - Optional short tip only if the draft already contains one: <div class="callout"><strong>Tip:</strong> ...</div>
- Use <h2> only when the draft already has clear section titles; never invent section headings.
- Keep paragraphs short and readable. Escape special characters properly in HTML text nodes.`;

function stripInlineCodeFences(text: string): string {
  return text
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function localFormatFallback(body: string): string {
  const trimmed = body.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return "";

  const plain = /<\/?[a-z][\s\S]*>/i.test(trimmed)
    ? trimmed
        .replace(/<\s*br\s*\/?>/gi, "\n")
        .replace(/<\/\s*(p|div|h[1-6]|li|blockquote)\s*>/gi, "\n\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    : trimmed;

  let parts = plain
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 1) {
    parts = plain
      .split(/\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  const escape = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  return parts
    .map((paragraph, index) => {
      const escaped = escape(paragraph).replace(/\n/g, "<br />");
      if (index === 0) return `<p class="lead">${escaped}</p>`;
      const dialogue =
        /["“”'‘’]/.test(paragraph) &&
        (/\b(sabi|sinabi|tanong|sagot)\b/i.test(paragraph) ||
          /^["“'‘]/.test(paragraph.trim()));
      if (dialogue) {
        return `<blockquote>\n  <p>${escaped}</p>\n</blockquote>`;
      }
      return `<p>${escaped}</p>`;
    })
    .join("\n\n");
}

export async function formatBlogBodyWithAi(input: {
  body: string;
  title?: string;
}): Promise<{ html: string; source: "ai" | "fallback" }> {
  const body = String(input.body ?? "").trim();
  if (!body) {
    throw new Error("BODY_REQUIRED");
  }

  const fallback = localFormatFallback(body);
  const user = [
    input.title?.trim() ? `Title (context only): ${input.title.trim()}` : "",
    "Draft body:",
    body,
  ]
    .filter(Boolean)
    .join("\n\n");

  const aiText = await geminiGenerateText({
    system: SYSTEM,
    user,
    fallback: "",
    temperature: 0.2,
    maxOutputTokens: 4096,
  });

  const cleaned = stripInlineCodeFences(aiText);
  if (!cleaned || !/<\s*(p|h2|blockquote|ul|ol|div)\b/i.test(cleaned)) {
    return { html: fallback, source: "fallback" };
  }

  return { html: cleaned, source: "ai" };
}
