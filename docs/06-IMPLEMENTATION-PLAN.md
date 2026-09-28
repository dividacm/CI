# Plano de Implementação

## Estado
V1 concluída e validada em produção. V2.0 é a fundação documental/arquitetural.

## Etapa 1 — documentação
PRD, TRD, fluxo, UI/UX, backend futuro, segurança/pentest e ADRs.

## Etapa 2 — V2.0
Mapear contratos App/Editor/Preview/Document/Storage/PDF; adicionar testes de caracterização; definir fronteiras para elementos estruturados; preservar bodyHtml; manter quality gates e E2E.

## Etapas seguintes
V2.1 régua/layout; V2.2 tipografia; V2.3 tabelas; V2.4/V2.5 gráficos e conectores; V2.6 zoom; V2.7 paginação avançada; V2.8 templates/multi-organização; V2.9 hardening.

## Quality gate
Typecheck → Biome → testes → cobertura → build → E2E → revisão funcional.

## Regra de release
Nenhuma etapa V2 deve degradar uma jornada V1. Mudanças devem ser pequenas, revisáveis e reversíveis.
