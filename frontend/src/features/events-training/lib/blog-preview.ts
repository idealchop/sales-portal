/**
 * Helpers for the Articles CMS live preview.
 */

/**
 * Simple starter HTML for WRS articles.
 * Title / author live in form fields — body should only hold story content.
 */
export const ARTICLE_BODY_HTML_TEMPLATE = `<p class="lead">Isulat dito ang panimulang talata — ang pangunahing mensahe ng artikulo sa 1–2 pangungusap.</p>

<h2>Bakit ito mahalaga</h2>
<p>Ipaliwanag ang konteksto para sa water station owners. Panatilihing maikli at malinaw ang bawat talata.</p>

<ul>
  <li>Unang mahalagang punto</li>
  <li>Pangalawang mahalagang punto</li>
  <li>Pangatlong mahalagang punto</li>
</ul>

<h2>Ano ang dapat gawin</h2>
<p>Ilista ang mga hakbang o payo na madaling sundin.</p>
<ol>
  <li>Unang hakbang</li>
  <li>Pangalawang hakbang</li>
  <li>Pangatlong hakbang</li>
</ol>

<blockquote>
  <p>Optional quote o key takeaway — isang linya na gusto mong tandaan ng mambabasa.</p>
</blockquote>

<div class="callout">
  <strong>Tip:</strong> Palitan ang mga placeholder text sa itaas. Huwag isama ang pamagat o author dito — nasa Title at Author fields ang mga iyon.
</div>

<h2>Konklusyon</h2>
<p>Isara ang artikulo sa maikling mensahe at, kung kailangan, isang malinaw na susunod na hakbang.</p>
`;

export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value.trim());
}

export function looksLikeStructuredArticleHtml(value: string): boolean {
  const trimmed = value.trim();
  if (!looksLikeHtml(trimmed)) return false;
  return /<(p|h2|h3|ul|ol|blockquote|div)\b/i.test(trimmed);
}

/**
 * Convert existing plain/draft content into clean article HTML.
 * Preserves wording — does not invent new story text.
 */
export function formatExistingBodyAsHtml(raw: string): string {
  const trimmed = raw.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return "";

  // Already structured HTML — leave as-is.
  if (looksLikeStructuredArticleHtml(trimmed) && /<p\b/i.test(trimmed)) {
    return trimmed.endsWith("\n") ? trimmed : `${trimmed}\n`;
  }

  const plain = looksLikeHtml(trimmed)
    ? htmlToPlainParagraphs(trimmed)
    : trimmed;
  const paragraphs = splitIntoParagraphs(plain);
  if (paragraphs.length === 0) return "";

  const htmlParts = paragraphs.map((paragraph, index) => {
    const escaped = escapeHtml(paragraph).replace(/\n/g, "<br />");
    if (index === 0) return `<p class="lead">${escaped}</p>`;
    if (looksLikeDialogue(paragraph)) {
      return `<blockquote>\n  <p>${escaped}</p>\n</blockquote>`;
    }
    return `<p>${escaped}</p>`;
  });

  return `${htmlParts.join("\n\n")}\n`;
}

/** Empty body → starter template; existing body → HTML-formatted version. */
export function resolveInsertTemplateBody(currentBody: string): string {
  const trimmed = currentBody.trim();
  if (!trimmed) return ARTICLE_BODY_HTML_TEMPLATE;
  return formatExistingBodyAsHtml(trimmed);
}

function splitIntoParagraphs(text: string): string[] {
  const normalized = text.trim();
  if (!normalized) return [];

  const byBlank = normalized
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (byBlank.length > 1) return byBlank;

  return normalized
    .split(/\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function looksLikeDialogue(paragraph: string): boolean {
  const hasQuotes = /["“”'‘’]/.test(paragraph);
  if (!hasQuotes) return false;
  return (
    /\b(sabi|sinabi|tanong|sagot)\b/i.test(paragraph) ||
    /^["“'‘]/.test(paragraph.trim())
  );
}

function htmlToPlainParagraphs(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|h[1-6]|li|blockquote)\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Wrap plain text so the preview still reads like an article. */
export function bodyHtmlForPreview(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  if (looksLikeHtml(trimmed)) return trimmed;
  return formatExistingBodyAsHtml(trimmed).trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildArticlePreviewDocument(input: {
  title: string;
  excerpt: string;
  body: string;
  authorName?: string;
  heroImageUrl?: string | null;
}): string {
  const title = input.title.trim() || "Untitled article";
  const excerpt = input.excerpt.trim();
  const authorName = input.authorName?.trim() ?? "";
  const body = bodyHtmlForPreview(input.body);
  const hero = input.heroImageUrl?.trim()
    ? `<img class="hero" src="${input.heroImageUrl.replace(/"/g, "&quot;")}" alt="" />`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 1.25rem 1.35rem 2rem;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    color: #18181b;
    background: #fff;
    line-height: 1.65;
    font-size: 15px;
  }
  .hero {
    display: block;
    width: 100%;
    max-height: 220px;
    object-fit: cover;
    border-radius: 14px;
    margin-bottom: 1.1rem;
    background: #f4f4f5;
  }
  h1 {
    margin: 0 0 0.35rem;
    font-size: 1.55rem;
    line-height: 1.25;
    letter-spacing: -0.02em;
  }
  .byline {
    margin: 0 0 0.75rem;
    color: #3f3f46;
    font-size: 0.9rem;
    font-weight: 600;
  }
  .excerpt {
    margin: 0 0 1.25rem;
    color: #71717a;
    font-size: 0.95rem;
  }
  .body :is(h1,h2,h3,h4) {
    margin: 1.4em 0 0.55em;
    line-height: 1.3;
    letter-spacing: -0.01em;
  }
  .body h2 { font-size: 1.2rem; }
  .body h3 { font-size: 1.05rem; }
  .body p { margin: 0 0 1em; }
  .body p.lead {
    font-size: 1.05rem;
    color: #3f3f46;
  }
  .body ul, .body ol { margin: 0 0 1em; padding-left: 1.35rem; }
  .body li { margin: 0.25em 0; }
  .body a { color: #0f766e; }
  .body img {
    max-width: 100%;
    height: auto;
    border-radius: 10px;
  }
  .body blockquote {
    margin: 0 0 1em;
    padding: 0.15rem 0 0.15rem 0.9rem;
    border-left: 3px solid #99f6e4;
    color: #3f3f46;
  }
  .body .callout {
    margin: 0 0 1em;
    padding: 0.85rem 1rem;
    border-radius: 12px;
    background: #f0fdfa;
    border: 1px solid #ccfbf1;
    color: #115e59;
  }
  .body pre, .body code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.86em;
  }
  .body pre {
    overflow: auto;
    padding: 0.85rem 1rem;
    border-radius: 10px;
    background: #f4f4f5;
  }
  .body code {
    padding: 0.1em 0.35em;
    border-radius: 4px;
    background: #f4f4f5;
  }
  .body pre code { padding: 0; background: transparent; }
  .empty {
    color: #a1a1aa;
    font-size: 0.9rem;
  }
</style>
</head>
<body>
  ${hero}
  <h1>${escapeHtml(title)}</h1>
  ${authorName ? `<p class="byline">${escapeHtml(authorName)}</p>` : ""}
  ${excerpt ? `<p class="excerpt">${escapeHtml(excerpt)}</p>` : ""}
  <div class="body">${
    body || '<p class="empty">Start writing to see a live preview.</p>'
  }</div>
</body>
</html>`;
}
