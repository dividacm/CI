import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '../../src/security/sanitizer';

describe('sanitizeHtml', () => {
  it('remove scripts e atributos de evento', () => {
    const result = sanitizeHtml('<p onclick="alert(1)">Olá<script>alert(2)</script></p>');

    expect(result).toBe('<p>Olá</p>');
  });

  it('preserva tags e atributos editoriais permitidos', () => {
    const result = sanitizeHtml('<p><strong>Texto</strong> <a href="https://example.com" title="Link">link</a></p>');

    expect(result).toContain('<strong>Texto</strong>');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('title="Link"');
  });
});
