# PRD — CI Editor

**Status:** baseline pós-V1

## Objetivo
Editor web para criação, edição, salvamento e exportação de Comunicação Interna em A4, com identidade visual configurável.

## Escopo V1 preservado
- criação e edição de documentos;
- campos administrativos;
- numeração anual e data automática;
- rich-text com formatação básica;
- copiar/recortar/colar texto;
- undo/redo;
- autosave e persistência local;
- cabeçalho/rodapé;
- preview A4, paginação, PDF e impressão;
- acessibilidade, observabilidade e tratamento de falhas.

## Evolução V2
V2 deve aproximar a experiência de Word/Google Docs sem degradar os fluxos V1. Ordem: V2.1 régua/layout; V2.2 tipografia; V2.3 tabelas; V2.4 elementos gráficos; V2.5 conectores; V2.6 zoom; V2.7 paginação avançada; V2.8 templates/multi-organização; V2.9 hardening.

## Fora do escopo atual
Autenticação, usuários/permissões, colaboração simultânea, backend de documentos, multi-tenant remoto, auditoria institucional completa e assinatura digital.

## Requisitos não funcionais
TypeScript strict, CI, testes automatizados, Playwright nas jornadas críticas, sanitização centralizada, logs sem conteúdo de documentos, acessibilidade e otimização baseada em métricas.
