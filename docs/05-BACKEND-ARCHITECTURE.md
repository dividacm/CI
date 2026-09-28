# Arquitetura Backend

**Status atual: não implementado. Documento de preparação.**

## Objetivo
Preparar fronteira para persistência remota, autenticação, permissões, templates e auditoria sem acoplar essas capacidades ao Editor.

## Estado atual
V1 é frontend-first e usa LocalStorage. Não existe API/backend de documentos no repositório.

## Arquitetura alvo
Web Editor → Application API → Auth/Authorization → Document Service → repositories → database/object storage.

## Princípios
Editor não conhece banco; API valida entrada; autorização ocorre no servidor; organização/tenant é contexto explícito; auditoria registra operações relevantes; HTML é sanitizado também no backend; secrets não ficam no frontend.

## Modelo futuro
Organization, User, Membership/Role, Template, Document, DocumentVersion e AuditEvent.

## Regra
Não adicionar banco ou autenticação apenas por antecipação. Backend começa quando houver requisito real de persistência compartilhada, controle de acesso ou administração remota.
