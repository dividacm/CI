# Estratégia de backup, exportação e recuperação de documentos

**Status:** exportação/importação JSON local publicada na V2.9.6. Esta branch adiciona cobertura E2E no navegador para restauração de backup e falha de persistência; o resultado depende dos checks da PR. Backup remoto/centralizado continua não implementado.

## 1. Estado atual e limite de proteção

- O documento ativo é persistido pelo adapter `DocumentStorage`, com implementação atual em `LocalStorageDocumentStorage`.
- Os dados são armazenados no `localStorage` do navegador, sob chaves `ci:document:<id>`; a referência do documento ativo também é local.
- O autosave reduz a perda por fechamento acidental, mas **não é backup**. Ele não protege contra limpeza dos dados do navegador, falha do perfil/dispositivo, corrupção, quota excedida ou perda de acesso ao equipamento.
- A aplicação client-side não oferece backup centralizado, histórico remoto nem recuperação administrativa. A exportação JSON local preserva o modelo editável; exportar PDF continua sendo útil para leitura/registro, mas não deve ser considerado cópia restaurável.

## 2. Formatos e propósito

| Formato | Uso | Pode restaurar o documento editável? |
|---|---|---|
| JSON estruturado do documento | Cópia de segurança/restauração futura | Sim, se o formato e a versão forem suportados |
| PDF exportado | Leitura, impressão e registro final | Não é o formato primário de restauração |
| Cópia completa dos dados locais | Recuperação técnica excepcional, se viável | Depende do navegador e da integridade; não é o fluxo recomendado |

A exportação JSON implementada inclui um único modelo de documento e metadados necessários à edição, com versão explícita de esquema. Não inclui dados de outros documentos, chaves internas do navegador, segredos ou dados de sessão.

## 3. Procedimento operacional provisório

Até que a validação automatizada e operacional do fluxo esteja concluída:

1. Ao concluir um documento importante, gerar o PDF final para registro e, se precisar continuar editável, usar **Exportar JSON** e guardar o arquivo em local institucional autorizado.
2. Guardar cópias somente em local institucional autorizado, com controle de acesso e proteção compatível com a classificação dos dados.
3. Não usar e-mail pessoal, nuvem pessoal, pendrive não autorizado ou repositório Git para transportar documentos com dados pessoais ou institucionais.
4. Não limpar os dados do navegador, trocar de perfil ou reinstalar o sistema antes de verificar que os documentos necessários foram exportados e que a cópia está íntegra.
5. Se houver suspeita de perda/corrupção, evitar continuar editando sobre a única cópia disponível. Registrar o ocorrido, preservar o que ainda está acessível e acionar o suporte responsável.

Este procedimento é mitigação temporária, não substitui uma funcionalidade de backup restaurável.

## 4. Requisitos para implementar exportação e restauração

- [x] Exportar um documento individual em JSON com nome de arquivo seguro e versão de esquema explícita.
- [x] Validar formato, tamanho, estrutura, campos, identificadores e versão ao importar.
- [x] Rejeitar JSON inválido, formatos/versões não suportados e documentos inválidos antes de persistir.
- [x] Sanitizar HTML e normalizar o modelo antes de persistir.
- [x] Exibir resumo e pedir confirmação; a importação cria uma cópia com novo ID quando há colisão.
- [x] Resolver conflito de ID com novo identificador e preservar a origem.
- [x] Validar antes de gravar e apresentar falhas de persistência sem indicar sucesso.
- [x] Oferecer confirmação de exportação e limitar o tamanho do arquivo.
- [x] Adicionar testes unitários de round-trip, sanitização, limites, versão desconhecida e colisão de ID.
- [ ] Confirmar que os novos testes E2E de importação real via navegador e falha de armazenamento passam no CI; ampliar casos de campos extras se necessário.
- [ ] Não registrar o conteúdo documental nos logs; registrar somente contexto técnico minimizado.
- [x] Documentar o fluxo local e as limitações; instruções institucionais finais ainda dependem de validação.

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
