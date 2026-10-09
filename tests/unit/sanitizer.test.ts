import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '../../src/security/sanitizer';

describe('sanitizeHtml', () => {
  it('remove scripts e atributos de evento', () => {
    const result = sanitizeHtml(
      '<p onclick="alert(1)">Olá<script>alert(2)</script></p>',
    );

    expect(result).toBe('<p>Olá</p>');
  });

  it('preserva tags e atributos editoriais permitidos', () => {
    const result = sanitizeHtml(
      '<p><strong>Texto</strong> <a href="https://example.com" title="Link">link</a></p>',
    );

    expect(result).toContain('<strong>Texto</strong>');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('title="Link"');
  });

  it('remove URLs javascript e data de links', () => {
    const result = sanitizeHtml(
      '<p><a href="javascript:alert(1)">js</a><a href="data:text/html,<script>alert(1)</script>">data</a></p>',
    );

    expect(result).not.toMatch(/javascript\s*:/i);
    expect(result).not.toMatch(/data\s*:\s*text\/html/i);
    expect(result).not.toContain('alert(1)');
    expect(result).toContain('<a>js</a>');
  });

  it('remove elementos SVG e atributos de evento não permitidos', () => {
    const result = sanitizeHtml(
      '<p>Seguro</p><svg onload="alert(1)"><script>alert(2)</script></svg><img src=x onerror="alert(3)">',
    );

    expect(result).toContain('<p>Seguro</p>');
    expect(result).not.toMatch(/<\/?svg\b/i);
    expect(result).not.toMatch(/onload\s*=/i);
    expect(result).not.toMatch(/onerror\s*=/i);
    expect(result).not.toContain('alert(');
  });

  it('sanitiza HTML malformado sem preservar scripts executáveis', () => {
    const result = sanitizeHtml(
      '<div><p>Texto<script><p>injetado</div><img src=x onerror=alert(1)>',
    );

    expect(result).toContain('Texto');
    expect(result).not.toMatch(/<script\b/i);
    expect(result).not.toMatch(/onerror\s*=/i);
    expect(result).not.toContain('alert(1)');
  });

  it('remove URLs perigosas de estilos inline e mantém formatação segura', () => {
    const result = sanitizeHtml(
      '<p style="color: red; background-image: url(javascript:alert(1))">Texto</p>',
    );

    expect(result).toContain('Texto');
    expect(result).not.toMatch(/javascript\s*:/i);
    expect(result).not.toContain('alert(1)');
    expect(result).toMatch(/style="[^"]*color:\s*red/i);
  });
});
