# Aviso de privacidade — RASCUNHO PARA REVISÃO ANTES DA PUBLICAÇÃO

> Este texto é operacional e ainda precisa ter responsável/controlador e canal de contato confirmados antes de aparecer no site.

## Para que os dados são usados

O Torres em Comum coleta os dados estritamente necessários para organizar a participação na consulta sobre a minuta do Regimento Interno do Torres de Olinda, permitir salvamento e retomada de rascunhos, evitar que mais de uma manifestação final seja contabilizada por unidade, aplicar a precedência definida entre proprietário e inquilino e manter rastreabilidade do processo.

## Dados tratados

- nome informado pelo participante;
- torre e apartamento;
- vínculo declarado com a unidade (proprietário ou inquilino);
- escolhas feitas em cada dispositivo da minuta;
- manifestações escritas voluntariamente pelo participante;
- identificadores técnicos aleatórios de rascunho e protocolo;
- datas, horários e hashes de integridade necessários à auditoria.

O sistema não solicita CPF, documento de identidade, telefone, dados bancários ou dados de saúde.

## Rascunhos

Enquanto a manifestação não for finalizada, ela permanece com status de rascunho e não integra as estatísticas da consulta. O navegador recebe um segredo aleatório para retomar o rascunho; o servidor armazena apenas o hash desse segredo.

## Manifestação final

Somente uma manifestação final permanece vigente por unidade. Se houver manifestação de inquilino e posteriormente o proprietário da mesma unidade finalizar uma manifestação, a do proprietário prevalece e a anterior passa a constar apenas no histórico de auditoria, sem ser contabilizada no painel.

## Dados públicos

O painel público não divulga nome, apartamento, torre, vínculo ou comentários individuais.

Resultados de um dispositivo somente são exibidos após pelo menos 5 respostas. Contagens de uma categoria entre 1 e 4 são mostradas apenas como “<5”; nesses casos, totais exatos e percentuais capazes de revelar a contagem suprimida também não são publicados.

## Texto livre

Não inclua CPF, telefone, endereço, informações sobre saúde, dados de crianças e adolescentes nem dados pessoais de terceiros no campo de manifestação.

## Segurança

Os registros individuais ficam em área privada do banco de dados, não acessível diretamente pelo site. A aplicação utiliza protocolo aleatório, hash de integridade calculado no servidor e histórico de auditoria para permitir verificação posterior sem tornar os votos individuais públicos.

## Retenção

**A definir antes do encerramento da consulta.** O prazo deverá considerar a necessidade de auditoria e eventual contestação, com posterior eliminação ou anonimização quando os dados identificáveis deixarem de ser necessários.

## Responsável e contato

**A confirmar antes da publicação.**
