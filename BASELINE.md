# CI Editor — Baseline / M0

**Versão:** 0.1  
**Data do baseline:** 2026-09-16  
**Arquivo analisado:** `ComunicacaoEditor.html`  
**Objetivo:** registrar o comportamento atual antes da refatoração para Vite + TypeScript.

---

## 1. Estado atual do repositório

O repositório atual é deliberadamente pequeno: o aplicativo está concentrado em `ComunicacaoEditor.html`, acompanhado pelos assets `cab.png` e `rodape.png`.

A implementação atual combina HTML, CSS e JavaScript em um único arquivo. O arquivo também carrega em runtime DOMPurify, html2canvas e jsPDF por CDN, além da fonte Carlito por Google Fonts.

---

## 2. Funcionalidades existentes

### Interface

Toolbar fixa contendo:

- negrito;
- itálico;
- sublinhado;
- alinhamento esquerdo;
- centralização;
- alinhamento direito;
- justificação;
- lista não ordenada;
- lista ordenada;
- seleção de fonte;
- aumento de fonte;
- redução de fonte;
- tamanho da fonte;
- cor da fonte;
- copiar;
- recortar;
- colar;
- alternância de caixa alta/baixa;
- limpeza de formatação;
- exportação PDF;
- limpeza do documento;
- salvamento.

A toolbar e os grupos possuem atributos ARIA básicos. fileciteturn3file0L2-L2

### Documento

O documento utiliza formato visual A4 (`210mm × 297mm`) e possui:

- cabeçalho;
- título "COMUNICAÇÃO INTERNA";
- número sequencial;
- campo De;
- campo Para;
- campo Assunto;
- corpo editável;
- data;
- assinatura;
- cargo;
- rodapé.

Os campos e corpo usam `contenteditable`. O valor padrão de "De" é a Gerência de Valores em Carteira e Cobrança - GCCOB; assinatura e cargo também possuem valores padrão específicos da implementação atual. fileciteturn3file0L2-L2

---

## 3. Módulos atuais identificados

Embora esteja em arquivo único, a implementação já possui fronteiras conceituais.

### `Utils`

Responsável por:

- notificações;
- debounce.

A notificação utiliza `aria-live="polite"` e transição visual. fileciteturn3file0L2-L2

### `RangeEngine`

Responsável por:

- obtenção de `Range`;
- substituição da seleção;
- colapso do cursor;
- wrapping de conteúdo;
- estilos inline;
- localização do bloco mais próximo;
- extração de texto.

`wrapWith()` utiliza `Range.surroundContents()` e possui fallback com `extractContents()`/`insertNode()`. fileciteturn4file0L2-L2

### `Formatting`

Responsável por:

- negrito;
- itálico;
- sublinhado;
- alinhamento;
- listas;
- fonte;
- cor;
- tamanho;
- ajuste incremental de tamanho;
- alternância de caixa;
- limpeza de formatação;
- foco no editor.

A formatação inline é implementada predominantemente por `span` + estilos CSS. fileciteturn4file0L2-L2

### `Clipboard`

Responsável por:

- copiar texto;
- recortar texto;
- colar texto.

Utiliza `navigator.clipboard` e fallback de cópia com `document.execCommand('copy')`. O paste atual lê texto puro com `readText()`. fileciteturn4file0L2-L2

### `Pagination`

Responsável por:

- detectar overflow vertical;
- criar nova página;
- dividir conteúdo por altura;
- mover assinatura para a última página.

A implementação atual trabalha clonando `.paper` e movendo nós finais do corpo para a página seguinte. fileciteturn4file0L2-L2 fileciteturn5file0L2-L2

### `State`

Responsável por:

- defaults;
- número sequencial;
- data;
- limpeza;
- salvar rascunho;
- carregar rascunho;
- apagar rascunho.

O estado atual utiliza `localStorage`. O contador do documento é baseado no ano e incrementado ao inicializar. fileciteturn5file0L2-L2

### `PDFModule`

Responsável por:

- converter cabeçalho/rodapé em Data URL;
- renderizar cada `.paper` com html2canvas;
- criar páginas A4 com jsPDF;
- salvar `comunicacao_interna.pdf`.

A implementação usa `scale: 2` e adiciona cada `.paper` como imagem PNG no PDF. fileciteturn5file0L2-L2

### `UndoRedo`

Mantém snapshots do `innerHTML` do `bodyEditor`, com limite de 50 estados, e fornece undo/redo por teclado. fileciteturn5file0L2-L2

---

# 4. Fluxo atual de inicialização

```text
IIFE principal
  ↓
cria UndoRedo
  ↓
registra atalhos Ctrl/Cmd+Z e Ctrl/Cmd+Y
  ↓
registra eventos da toolbar
  ↓
State.init()
  ↓
Pagination.init()
  ↓
configura debounce de autosave
  ↓
setInterval(saveDraft, 30000)
```

A inicialização também define a data caso o campo esteja vazio. Há múltiplas atribuições a `window.debouncedSaveDraft`, sendo a última efetivamente utilizada pelo handler de input. fileciteturn6file0L2-L2

---

# 5. Requisitos funcionais a preservar

Durante a migração, os seguintes comportamentos são baseline:

1. A aplicação abre diretamente no editor.
2. A4 é o formato visual padrão.
3. Existe cabeçalho e rodapé.
4. Existe numeração anual sequencial.
5. Existe data automática.
6. Campos principais são editáveis.
7. Corpo é `contenteditable`.
8. Toolbar altera o conteúdo selecionado.
9. Copiar/recortar/colar funcionam em texto.
10. Undo/redo funciona no corpo.
11. O rascunho é salvo localmente.
12. Existe autosave após edição.
13. Existe autosave periódico.
14. O documento pode ser limpo.
15. O PDF pode ser gerado.
16. Conteúdo longo pode gerar novas páginas.
17. Assinatura é mantida na última página.
18. A interface possui feedback de sucesso/erro.
19. Há responsividade básica para telas menores.
20. A impressão oculta a toolbar e remove sombra da página.

---

# 6. Comportamentos que precisam de testes de caracterização

Antes de alterar a implementação, criar testes para:

### Formatação

- seleção simples;
- seleção atravessando elementos;
- seleção parcial de texto;
- negrito/itálico/sublinhado combinados;
- aplicação repetida de estilo;
- fonte;
- tamanho;
- cor;
- alinhamento.

### Listas

- lista sem seleção;
- lista com seleção;
- seleção contendo múltiplos blocos;
- conversão envolvendo `<li>` existente.

### Seleção

- seleção antes de clicar na toolbar;
- seleção após operação;
- seleção em campos diferentes;
- seleção no body.

### Clipboard

- copiar texto;
- recortar;
- colar texto;
- ausência de permissão de clipboard;
- fallback de copy.

### Persistência

- novo documento;
- salvar;
- carregar;
- documento inválido no storage;
- storage indisponível;
- limpeza;
- recuperação após reload.

### Paginação

- conteúdo curto;
- conteúdo próximo ao limite;
- overflow;
- múltiplas páginas;
- conteúdo em blocos;
- assinatura na última página;
- resize.

### PDF

- uma página;
- múltiplas páginas;
- imagens;
- cabeçalho;
- rodapé;
- documento longo;
- falha de carregamento de imagem.

---

# 7. Riscos técnicos encontrados no baseline

## R1 — `contenteditable` + Range

**Severidade: alta**

A implementação depende diretamente de manipulação de `Range` e do DOM. `surroundContents()` pode falhar em seleções que atravessam estruturas incompatíveis, exigindo fallback. Isso torna o `RangeEngine` o principal componente de risco da migração. fileciteturn4file0L2-L2

**Plano:** isolar o componente e criar testes de borda antes de alterar comportamento.

## R2 — Paginação baseada em movimentação de nós

**Severidade: alta**

A paginação atual move `lastChild` até o overflow desaparecer. Isso pode quebrar semanticamente blocos, listas ou elementos parcialmente selecionados. fileciteturn5file0L2-L2

**Plano:** criar um `PaginationEngine` independente e testar blocos como unidades.

## R3 — PDF como screenshot

**Severidade: alta**

Cada página é convertida em imagem PNG e inserida no PDF. Isso simplifica a implementação, mas pode produzir PDFs grandes, texto não selecionável e divergência de layout. fileciteturn5file0L2-L2

**Plano:** preservar inicialmente por compatibilidade; posteriormente avaliar renderer de documento mais apropriado.

## R4 — Contador não transacional

**Severidade: alta**

`getNextNumber()` incrementa `localStorage` durante a inicialização. Abrir/recarregar a aplicação pode consumir um número mesmo sem emissão do documento. fileciteturn5file0L2-L2

**Plano:** separar "reservar número" de "criar documento" em uma futura camada de documento.

## R5 — Autosave excessivo

**Severidade: média**

O código configura múltiplas versões de `debouncedSaveDraft` e também executa `saveDraft()` a cada 30 segundos. O handler de input acaba utilizando a última função atribuída. fileciteturn6file0L2-L2

**Plano:** criar `AutosaveService` único, com política explícita.

## R6 — Clipboard limitado a texto

**Severidade: média**

O botão de paste utiliza `navigator.clipboard.readText()`, portanto o fluxo atual não preserva HTML rico. fileciteturn4file0L2-L2

**Plano:** implementar pipeline HTML/texto com sanitização na nova versão.

## R7 — Sanitização inconsistente

**Severidade: alta**

O save aplica uma configuração de atributos permitidos, enquanto o load utiliza `DOMPurify.sanitize(content)` com configuração diferente. Essa política deveria ser centralizada. fileciteturn5file0L2-L2

**Plano:** `Sanitizer` único com política versionada e testes de segurança.

## R8 — Dependências externas em runtime

**Severidade: média**

Fonte, DOMPurify, html2canvas e jsPDF são carregados externamente no HTML atual. fileciteturn3file0L2-L2 fileciteturn5file0L2-L2

**Plano:** migrar para dependências gerenciadas pelo package manager e bundle Vite.

---

# 8. Débitos arquiteturais

- estado diretamente no DOM;
- módulos implementados como IIFE;
- dependências globais (`window.jspdf`, `window.debouncedSaveDraft`);
- tipos inexistentes;
- armazenamento acoplado ao módulo de estado;
- PDF acoplado ao DOM atual;
- configuração organizacional hardcoded;
- assets referenciados por URL externa;
- regras de negócio misturadas com apresentação;
- ausência de testes automatizados;
- ausência de pipeline formal de qualidade.

---

# 9. Decisões de migração

### Manter inicialmente

- aparência geral;
- toolbar;
- modelo visual A4;
- campos atuais;
- comportamento básico do editor;
- geração de PDF;
- armazenamento local;
- shortcuts;
- cabeçalho e rodapé.

### Alterar durante a refatoração

- CDN → npm/bundle;
- JavaScript global → TypeScript modular;
- IIFE → módulos ES;
- `window` globals → dependências explícitas;
- estado implícito → modelo tipado;
- sanitização distribuída → serviço único;
- storage acoplado → adapter;
- configuração hardcoded → configuração de organização/template.

### Não alterar no primeiro ciclo

- UX geral;
- regras visuais do documento;
- comportamento do número sem antes criar testes de caracterização;
- estratégia de PDF sem uma implementação substituta validada.

---

# 10. Critério de conclusão do M0

O M0 será considerado concluído quando:

- todas as funcionalidades existentes estiverem documentadas;
- módulos atuais estiverem mapeados;
- riscos críticos estiverem registrados;
- fluxos de edição, persistência, paginação e PDF estiverem descritos;
- testes de caracterização prioritários estiverem definidos;
- o baseline estiver preservado no Git;
- a arquitetura alvo puder ser implementada sem depender de suposições não verificadas.

Após isso, iniciar a Fase 1 — Fundação Vite + TypeScript.
