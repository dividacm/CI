# CI Editor — Plano de Desenvolvimento e Arquitetura

**Versão:** 0.2  
**Status:** Plano aprovado para orientar a refatoração  
**Stack-alvo:** Vite + TypeScript  
**Arquitetura:** Frontend modular, inicialmente sem framework de UI  

---

## 1. Objetivo

Evoluir o editor de Comunicação Interna para uma aplicação modular, testável, segura, observável, resiliente e configurável, preservando inicialmente o comportamento existente.

A arquitetura deve permitir que o mesmo motor seja utilizado por diferentes setores ou organizações por meio de configuração, templates e branding, evitando forks e regras específicas espalhadas pelo código.

---

## 2. Princípios arquiteturais

### 2.1 Configuração, não fork

Tudo que varia entre organizações deve ser configuração:

- identidade visual;
- logo;
- cabeçalho e rodapé;
- cores;
- tipografia;
- campos;
- templates;
- assinatura;
- regras de preenchimento;
- feature flags.

O comportamento do editor permanece em código.

### 2.2 Separação de responsabilidades

```text
Application
    ↓
Configuration / Templates
    ↓
Document Model
    ↓
Editor Engine
    ↓
Preview / Print / PDF
```

O editor não deve conhecer organização, setor, branding ou persistência.

### 2.3 HTML não é o modelo de negócio

O `contenteditable` produz HTML para apresentação e edição. O documento persistível possui um modelo próprio e versionado.

### 2.4 Segurança por padrão

HTML proveniente de clipboard, storage, importação ou templates deve passar por sanitização antes de entrar no DOM.

### 2.5 Refatoração comportamentalmente conservadora

A primeira etapa da migração deve preservar comportamento e interface. Melhorias funcionais entram depois que a nova arquitetura estiver estável.

---

# 3. Stack

## Runtime / Build

- Vite
- TypeScript em `strict`
- DOM APIs nativas

## Dependências de aplicação

- DOMPurify
- html2canvas
- jsPDF

## Qualidade

- Biome para lint e formatter
- Vitest
- Testing Library
- Playwright
- Stryker Mutator
- Knip
- Arch-contract

## Observabilidade

- Sentry e/ou OpenTelemetry, conforme necessidade e viabilidade do ambiente
- logs estruturados em JSON

---

# 4. Estrutura proposta

```text
CI/
├── public/
│   └── assets/
├── src/
│   ├── main.ts
│   ├── app/
│   ├── editor/
│   ├── document/
│   ├── template/
│   ├── configuration/
│   ├── clipboard/
│   ├── security/
│   ├── storage/
│   ├── pdf/
│   ├── ui/
│   ├── observability/
│   ├── resilience/
│   ├── types/
│   └── styles/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── DEVELOPMENT_PLAN.md
```

---

# 5. Modelo multi-organização

```ts
interface OrganizationConfig {
  id: string;
  name: string;
  branding: BrandingConfig;
  defaultTemplateId: string;
  templates: TemplateConfig[];
  features?: FeatureFlags;
}
```

```ts
interface BrandingConfig {
  logo?: AssetReference;
  colors: {
    primary: string;
    secondary?: string;
    accent?: string;
  };
  typography: {
    family: string;
    baseSize: string;
  };
  header?: AssetReference;
  footer?: AssetReference;
}
```

---

# 6. Templates

```ts
interface TemplateConfig {
  id: string;
  name: string;
  page: PageConfig;
  fields: FieldConfig[];
  header?: AssetReference;
  footer?: AssetReference;
  signature?: SignatureConfig;
}
```

Campos:

```ts
interface FieldConfig {
  id: string;
  label: string;
  type: "text" | "textarea" | "date" | "number" | "select";
  required?: boolean;
  defaultValue?: string;
  maxLength?: number;
  options?: SelectOption[];
}
```

---

# 7. Documento

```ts
interface CommunicationDocument {
  version: number;
  metadata: DocumentMetadata;
  fields: Record<string, string>;
  content: {
    html: string;
  };
  templateId: string;
}
```

O modelo deverá ser serializável, validável e versionável.

---

# 8. Editor Core

Módulos principais:

- `Editor`
- `RangeEngine`
- `SelectionManager`
- `FormattingEngine`
- `HistoryManager`

O `RangeEngine` é componente crítico e deverá receber testes unitários extensivos.

Operações:

- seleção;
- Range;
- negrito;
- itálico;
- sublinhado;
- alinhamento;
- listas;
- fonte;
- tamanho;
- cor;
- limpeza de formatação;
- restauração de cursor/seleção.

---

# 9. Clipboard e sanitização

Pipeline:

```text
Clipboard
  ↓
Read
  ↓
Detect format
  ↓
Normalize
  ↓
Sanitize
  ↓
Transform
  ↓
Insert
```

Deve suportar inicialmente texto e HTML, com atenção especial a conteúdo originado do Word e de navegadores.

A sanitização será centralizada em `security/Sanitizer.ts`.

---

# 10. Undo / Redo

O histórico será desacoplado do editor visual.

Primeira implementação: snapshots do documento/estado relevante.

Evolução futura: operações incrementais caso performance ou tamanho do histórico justifiquem.

---

# 11. Persistência e autosave

Interface:

```ts
interface DocumentStorage {
  save(document: CommunicationDocument): Promise<void>;
  load(id: string): Promise<CommunicationDocument | null>;
  delete(id: string): Promise<void>;
  list(): Promise<DocumentSummary[]>;
}
```

Primeira implementação: armazenamento local. A abstração deverá permitir futura implementação via API sem alterar o editor.

Estados de persistência:

- `saved`
- `saving`
- `dirty`
- `error`

Autosave:

```text
Document changed
  ↓
Debounce
  ↓
Serialize
  ↓
Validate
  ↓
Save
  ↓
Status
```

---

# 12. PDF, impressão e paginação

A exportação deverá utilizar um subsistema próprio:

```text
Document
  ↓
Resolve Template
  ↓
Build Print View
  ↓
Calculate Layout
  ↓
Paginate
  ↓
Render
  ↓
PDF
```

A arquitetura não deverá ficar permanentemente acoplada a `html2canvas + jsPDF`.

A paginação deverá considerar:

- A4;
- orientação;
- margens;
- cabeçalho;
- rodapé;
- altura disponível;
- blocos;
- imagens;
- conteúdo longo;
- quebras de página.

---

# 13. Padrões de Interface e Motion

As decisões de interface deverão seguir princípios consistentes de feedback visual, acessibilidade e baixa intrusão.

## 13.1 Skeleton & Lazy Loading

Toda chamada assíncrona ou carregamento de rota/view que resulte em espera perceptível deve apresentar um Skeleton Loader fiel à estrutura do conteúdo final.

No editor, isso se aplica especialmente a:

- carregamento de documentos;
- carregamento de templates;
- carregamento de configurações;
- carregamento de assets;
- futuras telas administrativas.

Não utilizar skeleton para operações instantâneas apenas para adicionar movimento.

## 13.2 Micro-interações

Ações rotineiras devem utilizar micro-interações curtas, preferencialmente entre **180 ms e 300 ms**.

Exemplos:

- hover/focus da toolbar;
- abertura de menus;
- feedback de salvamento;
- toast/notification;
- transições de estados.

Evitar animações decorativas ou intrusivas durante edição, digitação ou seleção de texto.

## 13.3 Reduced Motion

Toda animação/transição relevante deverá respeitar:

```css
@media (prefers-reduced-motion: reduce) {
  /* reduzir ou remover movimento não essencial */
}
```

O suporte será obrigatório para qualquer animação implementada no produto.

---

# 14. Observabilidade

A aplicação deverá possuir uma camada de observabilidade desacoplada da lógica de negócio.

## 14.1 Rastreamento de erros

Erros inesperados deverão ser registrados com contexto suficiente para diagnóstico, incluindo stack trace quando disponível.

A integração alvo será:

- Sentry para monitoramento de aplicação;
- OpenTelemetry quando houver necessidade de tracing distribuído ou integração com backend.

Não enviar conteúdo sensível do documento, credenciais ou dados pessoais desnecessários para serviços de observabilidade.

## 14.2 Logs estruturados

Logs deverão utilizar estrutura JSON quando houver logging persistente ou integração com infraestrutura.

Formato conceitual:

```json
{
  "timestamp": "2026-09-16T14:00:00.000Z",
  "level": "error",
  "event": "document.save.failed",
  "context": {
    "documentId": "..."
  },
  "error": {
    "name": "Error",
    "message": "...",
    "stack": "..."
  }
}
```

Timestamps devem utilizar ISO 8601.

---

# 15. Resiliência

Operações assíncronas deverão possuir tratamento explícito de falha.

Exemplos:

```text
Carregar documento
  ├── sucesso → editor
  └── erro → estado recuperável + feedback

Salvar
  ├── sucesso → saved
  └── erro → dirty + retry/feedback

PDF
  ├── sucesso → download
  └── erro → export_error + diagnóstico
```

Operações críticas não devem falhar silenciosamente.

Quando possível, a aplicação deverá preservar o conteúdo local em caso de erro de persistência ou exportação.

---

# 16. Qualidade de código

## 16.1 Biome

Biome será o padrão de lint e formatting.

Comando de referência:

```bash
pnpm biome check --write
```

O CI deverá validar o estado formatado e sem violações.

## 16.2 TypeScript

Regras:

- `strict: true`;
- evitar `any`;
- tipos explícitos em contratos públicos;
- validação de dados externos;
- interfaces para fronteiras entre módulos.

## 16.3 Cleanliness

Knip será utilizado para detectar:

- código não utilizado;
- exports não utilizados;
- dependências desnecessárias.

Arch-contract será utilizado para verificar contratos/regras arquiteturais definidos para os módulos.

Ambos deverão integrar o fluxo de qualidade/pre-push quando a configuração estiver estabilizada.

---

# 17. Pirâmide de testes

## 17.1 Unitários e integração

Stack:

- Vitest;
- Testing Library.

Cobertura mínima inicial: **80%**.

A métrica de cobertura não substitui qualidade dos testes. Componentes críticos como `RangeEngine`, sanitização, serialização, validação, histórico e paginação deverão ter cobertura direcionada a casos de borda.

## 17.2 E2E

Stack: Playwright.

Jornadas críticas:

1. abrir editor;
2. criar documento;
3. preencher campos;
4. editar conteúdo;
5. aplicar formatação;
6. colar HTML;
7. desfazer/refazer;
8. salvar;
9. recarregar;
10. recuperar documento;
11. exportar PDF;
12. imprimir.

## 17.3 Mutação

Stryker Mutator será aplicado principalmente às regras de negócio críticas:

- validação;
- sanitização;
- resolução de templates;
- paginação;
- histórico;
- regras de campos.

O objetivo não é maximizar uma métrica isolada, mas verificar se os testes realmente detectam alterações semânticas.

---

# 18. CI/CD e Quality Gates

Pipeline alvo:

```text
Pull Request
    ↓
Install
    ↓
Typecheck
    ↓
Biome
    ↓
Unit / Integration
    ↓
Coverage
    ↓
Knip
    ↓
Arch-contract
    ↓
Build
    ↓
E2E
    ↓
Mutation — conforme estratégia/branch
    ↓
Merge
```

Nem todas as verificações precisam ter o mesmo custo em todo commit. Stryker, por exemplo, pode ser executado em pipeline dedicado ou em branches de validação, enquanto checks rápidos devem bloquear PRs diretamente.

---

# 19. Acessibilidade

Requisitos:

- navegação por teclado;
- foco visível;
- ARIA apropriado;
- toolbar acessível;
- mensagens de status;
- contraste adequado;
- suporte a `prefers-reduced-motion`;
- comportamento previsível de `contenteditable`;
- diálogos acessíveis.

A acessibilidade será considerada requisito funcional, não etapa opcional de acabamento.

---

# 20. Performance

Prioridades:

- evitar renderizações desnecessárias;
- debounce em autosave;
- lazy loading onde houver benefício real;
- limitar trabalho durante `input`/`selectionchange`;
- evitar serializações completas excessivas;
- monitorar tamanho do bundle;
- medir PDF e documentos longos.

O editor não deverá introduzir animações ou processamento custoso no caminho crítico da digitação.

---

# 21. Backlog por fases

## Fase 0 — Baseline

- inventariar funcionalidades atuais;
- mapear eventos;
- mapear toolbar;
- mapear clipboard;
- mapear sanitização;
- mapear persistência;
- mapear PDF;
- criar testes de caracterização;
- documentar limitações atuais.

## Fase 1 — Fundação

- Vite;
- TypeScript strict;
- Biome;
- Vitest;
- Testing Library;
- Playwright;
- Stryker;
- Knip;
- Arch-contract;
- estrutura inicial de CI.

## Fase 2 — Migração visual

- HTML;
- CSS;
- assets;
- fontes;
- remover CDN runtime;
- equivalência visual.

## Fase 3 — Editor Core

- Editor;
- RangeEngine;
- SelectionManager;
- FormattingEngine;
- toolbar;
- atalhos;
- undo/redo.

## Fase 4 — Clipboard e segurança

- clipboard;
- paste HTML;
- normalização;
- sanitização;
- casos Word/browser;
- testes XSS.

## Fase 5 — Document Model

- CommunicationDocument;
- serializer;
- validator;
- versionamento.

## Fase 6 — Storage

- DocumentStorage;
- implementação local;
- autosave;
- recuperação;
- estados de persistência.

## Fase 7 — Templates

- TemplateConfig;
- TemplateRegistry;
- campos configuráveis;
- template padrão.

## Fase 8 — Branding

- OrganizationConfig;
- logo;
- cores;
- fontes;
- cabeçalho;
- rodapé;
- assinatura.

## Fase 9 — PDF / Print

- Print View;
- PDF exporter;
- paginação;
- A4;
- margens;
- cabeçalho/rodapé;
- documentos longos.

## Fase 10 — Hardening

- acessibilidade;
- performance;
- observabilidade;
- resiliência;
- E2E;
- mutação;
- regressão visual;
- auditoria de dependências.

---

# 22. Critérios de aceitação do MVP

O MVP deverá:

- executar via Vite;
- compilar em TypeScript strict;
- passar Biome;
- possuir testes automatizados;
- não depender de CDN em runtime;
- preservar as funcionalidades atuais;
- sanitizar HTML;
- suportar formatação básica;
- suportar clipboard;
- suportar undo/redo;
- serializar documentos;
- salvar e recuperar documentos;
- gerar PDF;
- imprimir;
- suportar cabeçalho/rodapé configuráveis;
- respeitar acessibilidade e reduced motion;
- possuir tratamento de erro nas operações críticas.

---

# 23. Principais riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Range/Selection inconsistente | Alto | testes específicos e isolamento do RangeEngine |
| DOM inválido | Alto | normalização + sanitização |
| Paste complexo | Alto | pipeline dedicado |
| PDF divergente do editor | Alto | Print View independente |
| Paginação incorreta | Alto | engine de paginação + testes |
| Perda de conteúdo | Crítico | autosave + snapshots |
| XSS | Crítico | sanitização centralizada |
| Crescimento monolítico | Alto | modularização + Arch-contract |
| Configuração espalhada | Alto | OrganizationConfig |
| Dependências não utilizadas | Médio | Knip |
| Regressões não detectadas | Alto | Vitest + Playwright + mutação |
| Falhas silenciosas | Alto | observabilidade + estados explícitos |

---

# 24. Regra fundamental de extensibilidade

> Tudo que muda entre empresas ou setores deve ser configuração; tudo que define o funcionamento do editor deve ser código.

Exemplos:

```text
Logo                  → configuração
Cores                 → configuração
Fonte                 → configuração
Cabeçalho             → configuração
Rodapé                → configuração
Campos                → configuração
Templates             → configuração
Assinatura            → configuração

Seleção de texto     → código
Formatação           → código
Undo/Redo            → código
Sanitização          → código
Clipboard            → código
Paginação            → código
PDF                  → código
```

---

# 25. Primeiro milestone

## M0 — Baseline

Nenhuma grande alteração funcional deverá começar antes de concluir o baseline.

Entregáveis:

1. mapa completo das funcionalidades existentes;
2. mapa de eventos;
3. mapa do fluxo de dados;
4. mapa de dependências;
5. testes de caracterização;
6. inventário de riscos;
7. definição das regras de compatibilidade;
8. baseline de build e comportamento visual.

Depois do M0, a migração poderá ocorrer incrementalmente com comparação objetiva entre a implementação original e a refatorada.

---

# 26. Evolução futura

A arquitetura deverá permitir evolução para:

- backend/API;
- autenticação;
- usuários;
- permissões;
- documentos compartilhados;
- auditoria;
- versionamento;
- multi-tenant;
- catálogo de templates;
- administração de organizações;
- storage remoto;
- observabilidade distribuída.

Esses recursos não fazem parte do MVP e não devem aumentar desnecessariamente a complexidade inicial.
