# Fluxo de trabalho deste projeto

Estas instruções valem para qualquer agente de IA (de qualquer modelo/ferramenta) que
trabalhe neste repositório — não é específico do Claude.

## Issue no GitHub antes de qualquer tarefa

Para **toda tarefa** — correção de bug, melhoria ou função nova — crie primeiro uma
issue no GitHub descrevendo o que vai ser feito, antes de escrever código. A issue é
o registro do que foi pedido e por quê; serve pra rastrear o trabalho e dar contexto
pra quem for revisar depois.

- Título curto e direto (o que muda).
- Descrição com o pedido original do usuário e, se fizer sentido, os arquivos/áreas
  já identificados como relevantes.

## Trabalhe com branch + Pull Request, não commit direto na `main`

Depois de criar a issue:

1. Crie uma branch a partir da `main` (nome curto, descritivo, ex.: `fix/login-dominio`,
   `feat/modulos-aulas`).
2. Faça o trabalho e os commits nessa branch.
3. Abra um Pull Request da branch pra `main`.
4. **Na descrição do PR, sempre mencione a issue correspondente** (ex.: `Closes #12`
   ou `Refs #12`) — isso fecha a issue automaticamente quando o PR é mergeado e deixa
   o histórico rastreável.

Não faça commit direto na `main` pra tarefas de código — mesmo pra mudanças pequenas,
passe pela issue + branch + PR.

## Requisito prático

Esse fluxo depende do `gh` (GitHub CLI) instalado e autenticado na máquina.
Se `gh` não estiver disponível, avise o usuário antes de prosseguir — não é possível
criar issues/PRs pelo GitHub sem ele.
