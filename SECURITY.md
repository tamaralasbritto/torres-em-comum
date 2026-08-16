# Segurança e privacidade — Torres em Comum

## Princípios

O sistema foi desenhado para que auditabilidade da consulta não implique exposição pública da identidade dos participantes.

- Dados individuais (`nome`, `torre`, `apartamento`, vínculo e respostas) ficam no schema PostgreSQL `private`.
- `anon`, `authenticated` e `service_role` não possuem acesso ao schema privado pelo Data API.
- O frontend acessa somente a Edge Function `participation`; nenhuma credencial privilegiada é entregue ao navegador.
- Cada rascunho recebe um token aleatório de retomada com 256 bits. O banco armazena somente o SHA-256 desse token.
- Uma manifestação final recebe UUID de protocolo e SHA-256 calculado no servidor a partir do registro canônico armazenado.
- O log de auditoria é append-only: alterações e exclusões são bloqueadas por trigger.
- Apenas uma manifestação pode estar vigente (`finalized`) por unidade.
- Manifestação de proprietário prevalece sobre manifestação de inquilino. Registros substituídos permanecem no histórico como `superseded`, mas deixam de contar no painel.
- Rascunhos nunca contam como voto.

## Divulgação pública

O painel público aplica limiar mínimo `k = 5`:

- Um dispositivo com menos de 5 respostas não é publicado.
- Uma categoria não nula com menos de 5 respostas aparece apenas como `<5`.
- Quando existe uma célula suprimida, o total exato e os percentuais daquele dispositivo também são omitidos, evitando reconstrução por diferença.
- Não são publicados nome, apartamento, torre, vínculo, comentários individuais ou recortes por torre.

## Limitações assumidas

A identificação é declaratória. O sistema impede duplicidade de manifestação final por unidade e aplica precedência do proprietário, mas não comprova documentalmente a titularidade ou a locação.

O protocolo e o hash fornecem rastreabilidade e verificação de integridade do registro armazenado; não equivalem, por si só, a assinatura digital qualificada nem tornam impossível uma alteração por um administrador com controle total da infraestrutura.

A Edge Function de criação de rascunhos é pública porque a consulta é de autoatendimento. Antes da abertura pública deve ser reavaliada a necessidade de proteção antiabuso (por exemplo, rate limiting ou desafio anti-bot), considerando o curto período da consulta e o atrito imposto aos moradores.

## Dados em texto livre

O campo de manifestação orienta o usuário a não inserir CPF, telefone, dados de crianças, informações de saúde ou dados pessoais de terceiros. Comentários nunca são publicados individualmente.

## Segredos

- Nunca colocar `SUPABASE_DB_URL`, secret key ou `service_role` no frontend ou no repositório.
- A Edge Function usa exclusivamente segredos gerenciados no ambiente Supabase.
- Dependências de frontend devem permanecer fixadas e acompanhadas de `package-lock.json` versionado.
