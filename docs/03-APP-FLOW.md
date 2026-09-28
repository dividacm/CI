# Fluxo do App

## Inicialização
Browser → main.ts → App → configuração/layout → template → storage/numbering/PDF/state → shell → Editor → documento ativo → preview.

## Edição
Usuário → Editor → Range/Formatting → input/change → App → preview → autosave → storage.

## Persistência
Mudança → dirty → debounce/retry → serialização → sanitização → save → saved/error.

## PDF
Exportar → preview atual → páginas → html2canvas → PNG → jsPDF A4 → download.

## Teclado
Ctrl/Cmd é usado para salvar, undo/redo, clipboard, bold, italic, underline, alinhamentos e listas.

## Falhas
Operações críticas terminam em estado explícito. Falhas de storage/PDF são observáveis e não devem apagar o conteúdo de trabalho.

## Regra V2
Novos recursos entram como comandos/serviços do editor e controles de UI, evitando regras de documento diretamente na apresentação.
