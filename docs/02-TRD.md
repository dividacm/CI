# TRD — Requisitos Técnicos

**Status:** baseline técnico pós-V1

## Stack
Vite, TypeScript strict, DOM APIs nativas, Biome, Vitest, Playwright, DOMPurify, html2canvas e jsPDF.

## Arquitetura atual
App orquestra configuração, editor, documento, storage, autosave, preview/paginação, PDF, segurança e observabilidade. Editor utiliza RangeEngine, FormattingEngine, HistoryManager e ClipboardService.

## Documento
CommunicationDocument atualmente contém id, number, year, fields, bodyHtml, templateId, createdAt e updatedAt. bodyHtml permanece persistido durante V2 inicial.

## Storage
DocumentStorage é a fronteira entre o editor e a implementação atual em LocalStorage. A evolução remota deve usar o mesmo adapter conceitual.

## Segurança
HTML persistido ou recebido passa por sanitização centralizada. A política atual bloqueia conteúdo executável e data attributes.

## PDF
O exportador atual usa html2canvas + jsPDF e páginas A4 renderizadas como imagem. A decisão é mantida por compatibilidade e deve permanecer substituível.

## Requisitos V2
Documentar contratos App/Editor/Preview/Document/Storage/PDF; criar testes de caracterização; evitar framework de UI sem justificativa; preservar V1; manter mudanças pequenas e reversíveis.
