import { describe, expect, it, vi } from 'vitest';
import { createAppActions } from '../../src/app/AppActions';

function state() {
  return {
    document: { id: '1', number: 0, year: 2026, fields: {}, bodyHtml: '', templateId: 't', createdAt: '', updatedAt: '' },
    template: { id: 't', name: 'Teste', fields: [{ id: 'assunto', label: 'Assunto', defaultValue: 'Padrão' }] },
  } as any;
}

describe('createAppActions', () => {
  it('sincroniza campos e conteúdo sanitizado e marca dirty', () => {
    const s = state();
    const editor = { getHtml: () => '<p>Olá</p><script>alert(1)</script>', setHtml: vi.fn() } as any;
    const autosave = { markDirty: vi.fn(), saveNow: vi.fn(), attach: vi.fn() } as any;
    const issuer = { issue: vi.fn() } as any;
    const actions = createAppActions(s, editor, autosave, issuer, id => id === 'assunto' ? 'Novo' : '');
    actions.sync();
    expect(s.document.fields.assunto).toBe('Novo');
    expect(s.document.bodyHtml).not.toContain('<script>');
    expect(autosave.markDirty).toHaveBeenCalled();
  });

  it('limpa o documento e marca dirty', () => {
    const s = state();
    const editor = { getHtml: () => '', setHtml: vi.fn() } as any;
    const autosave = { markDirty: vi.fn(), saveNow: vi.fn(), attach: vi.fn() } as any;
    const issuer = { issue: vi.fn() } as any;
    const actions = createAppActions(s, editor, autosave, issuer, () => '');
    actions.clear();
    expect(editor.setHtml).toHaveBeenCalledWith('');
    expect(autosave.markDirty).toHaveBeenCalled();
  });

  it('emite documento uma única vez e conecta o autosave', async () => {
    const s = state();
    const issued = { ...s.document, number: 12 };
    const editor = { getHtml: () => '<p>Conteúdo</p>', setHtml: vi.fn() } as any;
    const autosave = { markDirty: vi.fn(), saveNow: vi.fn(), attach: vi.fn() } as any;
    const issuer = { issue: vi.fn().mockResolvedValue(issued) } as any;
    const actions = createAppActions(s, editor, autosave, issuer, () => 'x');
    await expect(actions.issue()).resolves.toBe(true);
    expect(issuer.issue).toHaveBeenCalled();
    expect(autosave.saveNow).toHaveBeenCalled();
    expect(autosave.attach).toHaveBeenCalledWith(issued);
    await expect(actions.issue()).resolves.toBe(false);
  });
});
