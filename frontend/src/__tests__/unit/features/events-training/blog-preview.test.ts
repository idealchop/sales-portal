import { describe, expect, it } from "vitest";
import {
  bodyHtmlForPreview,
  formatExistingBodyAsHtml,
  looksLikeHtml,
  resolveInsertTemplateBody,
} from "@/features/events-training/lib/blog-preview";

describe("blog-preview helpers", () => {
  it("detects HTML markup", () => {
    expect(looksLikeHtml("<p>Hello</p>")).toBe(true);
    expect(looksLikeHtml("Hello world")).toBe(false);
  });

  it("wraps plain text into paragraphs for preview", () => {
    expect(bodyHtmlForPreview("Hello\n\nWorld")).toContain(
      '<p class="lead">Hello</p>',
    );
    expect(bodyHtmlForPreview("Hello\n\nWorld")).toContain("<p>World</p>");
  });

  it("passes through HTML bodies", () => {
    const html = "<h2>Title</h2><p>Body</p>";
    expect(bodyHtmlForPreview(html)).toBe(html);
  });

  it("formats existing plain story content into HTML", () => {
    const draft = [
      "Unang talata ng kwento.",
      'Kaya ang sabi ko, "Lagot ka sa akin!"',
      "Pangwakas na tanong.",
    ].join("\n\n");
    const html = formatExistingBodyAsHtml(draft);
    expect(html).toContain('<p class="lead">Unang talata ng kwento.</p>');
    expect(html).toContain("<blockquote>");
    expect(html).toContain("Lagot ka sa akin!");
    expect(html).toContain("<p>Pangwakas na tanong.</p>");
  });

  it("uses starter template only when body is empty", () => {
    expect(resolveInsertTemplateBody("")).toContain("class=\"lead\"");
    expect(resolveInsertTemplateBody("May laman na.")).toContain(
      '<p class="lead">May laman na.</p>',
    );
  });
});
