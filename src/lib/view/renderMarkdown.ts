import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';

// html: false rejects raw HTML tags in the source rather than passing them
// through — descriptions can come from a hand-edited/shared YAML file, not
// just the app's own rich-text editor, so the input isn't trusted.
// DOMPurify sanitizes the rendered output as a second layer, in case a
// future markdown-it option (or plugin) ever emits something unsafe.
const md = new MarkdownIt({ html: false, linkify: true });

/** Renders a story description (Markdown, as stored in the db/YAML) to sanitized HTML. */
export function renderMarkdownToHtml(markdown: string): string {
  return DOMPurify.sanitize(md.render(markdown));
}
