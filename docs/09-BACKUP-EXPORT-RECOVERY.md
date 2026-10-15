# Estratégia de backup, exportação e recuperação de documentos

**Status:** proposta operacional para revisão; não significa que os recursos de exportação/importação de backup já estejam implementados.

## 1. Estado atual e limite de proteção

- O documento ativo é persistido pelo adapter `DocumentStorage`, com implementação atual em `LocalStorageDocumentStorage`.
- Os dados são armazenados no `localStorage` do navegador, sob chaves `ci:document:<id>`; a referência do documento ativo também é local.
- O autosave reduz a perda por fechamento acidental, mas **não é backup**. Ele não protege contra limpeza dos dados do navegador, falha do perfil/dispositivo, corrupção, quota excedida ou perda de acesso ao equipamento.
- A aplicação client-side atual não oferece backup centralizado, histórico remoto nem recuperação administrativa. Exportar PDF é útil para leitura/registro, mas não preserva necessariamente a estrutura editável e não deve ser considerado cópia restaurável.

## 2. Formatos e propósito

| Formato | Uso | Pode restaurar o documento editável? |
|---|---|---|
| JSON estruturado do documento | Cópia de segurança/restauração futura | Sim, se o formato e a versão forem suportados |
| PDF exportado | Leitura, impressão e registro final | Não é o formato primário de restauração |
| Cópia completa dos dados locais | Recuperação técnica excepcional, se viável | Depende do navegador e da integridade; não é o fluxo recomendado |

A futura exportação JSON deve incluir o modelo de documento e metadados necessários à edição, com versão explícita de esquema. Não deve incluir dados de outros documentos, chaves internas do navegador, segredos ou dados de sessão.

## 3. Procedimento operacional provisório

Até existir um fluxo testado de exportação/importação no produto:

1. Ao concluir um documento importante, gerar o PDF final para registro e, se o documento precisar continuar editável, manter uma cópia editável apenas por um mecanismo de exportação aprovado quando disponível.
2. Guardar cópias somente em local institucional autorizado, com controle de acesso e proteção compatível com a classificação dos dados.
3. Não usar e-mail pessoal, nuvem pessoal, pendrive não autorizado ou repositório Git para transportar documentos com dados pessoais ou institucionais.
4. Não limpar os dados do navegador, trocar de perfil ou reinstalar o sistema antes de verificar que os documentos necessários foram exportados e que a cópia está íntegra.
5. Se houver suspeita de perda/corrupção, evitar continuar editando sobre a única cópia disponível. Registrar o ocorrido, preservar o que ainda está acessível e acionar o suporte responsável.

Este procedimento é mitigação temporária, não substitui uma funcionalidade de backup restaurável.

## 4. Requisitos para implementar exportação e restauração

- [ ] Exportar um documento individual em JSON com nome de arquivo seguro e versão de esquema explícita.
- [ ] Validar tipo, tamanho, estrutura, campos obrigatórios, identificadores e versão ao importar.
- [ ] Rejeitar arquivos inválidos ou versões não suportadas com mensagem compreensível, sem alterar o documento atual.
- [ ] Sanitizar HTML no caminho de importação e normalizar o modelo antes de persistir.
- [ ] Mostrar resumo/preview e pedir confirmação antes de restaurar; nunca sobrescrever silenciosamente um documento existente.
- [ ] Quando houver conflito de ID, criar uma cópia restaurada com novo ID ou exigir decisão explícita; preservar a origem.
- [ ] Fazer a gravação de modo seguro: validar tudo antes de gravar e tratar quota/falha de escrita sem indicar sucesso indevidamente.
- [ ] Oferecer confirmação de exportação e permitir verificar se o arquivo não está vazio.
- [ ] Testar round-trip exportar → importar → comparar conteúdo e metadados relevantes.
- [ ] Testar JSON truncado, payload excessivo, campos extras, esquema desconhecido, HTML malicioso, ID duplicado e falha de armazenamento.
- [ ] Não registrar o conteúdo documental nos logs; registrar somente contexto técnico minimizado.
- [ ] Documentar instruções para operador e usuário final, incluindo limitações do formato.

## 5. Backup institucional e recuperação

Se a aplicação passar a usar armazenamento remoto, o backup deverá ser responsabilidade do serviço de armazenamento e da operação institucional, não apenas do navegador.

Requisitos mínimos antes de produção com armazenamento remoto:
- cópias automáticas e criptografadas em repouso e em trânsito;
- retenção e exclusão definidas pela política institucional e requisitos legais;
- separação de permissões entre uso normal e administração/recuperação;
- proteção contra exclusão acidental e comprometimento da conta principal;
- monitoramento de falhas de backup e alertas;
- teste documentado de restauração em ambiente isolado;
- trilha de auditoria sem conteúdo documental desnecessário;
- plano de continuidade, responsáveis e canal de escalonamento.

## 6. Critérios de recuperação e validação

A restauração só será considerada concluída quando:
1. a origem e a data da cópia estiverem identificadas;
2. a cópia passar pela validação de formato e integridade;
3. o documento restaurado abrir no editor sem erro;
4. os campos, conteúdo, template e metadados necessários forem conferidos;
5. o usuário responsável confirmar o resultado;
6. o evento e o resultado forem registrados sem expor o conteúdo do documento.

**Metas operacionais:** definir RPO (perda máxima de dados aceitável), RTO (tempo máximo de recuperação), retenção e frequência de backup com a área responsável. Nenhum valor está aprovado nesta proposta; não assumir que há compromisso operacional antes dessa decisão.

## 7. Critério de aceite da estratégia

- O usuário sabe distinguir autosave, exportação PDF e backup restaurável.
- Existe um fluxo JSON de exportação/importação coberto por testes antes de afirmar que há backup local restaurável.
- A restauração não sobrescreve dados silenciosamente e falhas não são reportadas como sucesso.
- Se houver armazenamento remoto, a operação de backup e os testes periódicos de restauração têm responsáveis definidos.
- As instruções e limitações são apresentadas aos usuários antes do uso institucional com documentos importantes.
