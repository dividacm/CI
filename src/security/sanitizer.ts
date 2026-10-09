import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'a',
  'b',
  'blockquote',
  'br',
  'div',
  'em',
  'i',
  'li',
  'ol',
  'p',
  'span',
  'strong',
  'table',
  'tbody',
  'td',
  'tr',
  'u',
  'ul',
];

const ALLOWED_ATTR = ['data-ci-table', 'href', 'title', 'target', 'rel', 'style'];
const UNSAFE_CSS_VALUE = /(?:url\s*\(|expression\s*\(|javascript\s*:|vbscript\s*:|@import)/i;

// DOMPurify allows inline styles for editor formatting, so reject an entire style
// attribute when it contains constructs that can load or execute unsafe content.
DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName === 'style' && UNSAFE_CSS_VALUE.test(data.attrValue)) {
    data.keepAttr = false;
  }
});

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'],
  });
}
