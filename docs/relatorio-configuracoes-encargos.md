# Configurações, cadastro e encargos automáticos

Entrega validada localmente em 02/11/2026, preservando a stack existente.

## Comportamento

- Configurações separadas em contas/cadastro, pagamentos e acessibilidade.
  Tipo padrão de conta persistido por usuário, indicação de mudanças,
  descarte e restauração de padrões. Falha de leitura impede salvar valores
  padrão sobre preferências que não foram carregadas.
- Cadastro com confirmação de senha validada separadamente, foco no primeiro
  campo inválido, limite UTF-8 e aviso de Caps Lock. Após concluir, apresenta
  próximos passos e preenche o e-mail no login, sem transportar a senha.
- “Também paguei encargos” solicita a prévia autenticada ao backend e acrescenta
  os juros calculados ao total. Não exige digitação de encargos.
- O cálculo considera o principal amortizado e a data escolhida, inclusive
  pagamento parcial e data retroativa. Até o vencimento, retorna zero sem
  consultar taxas. Taxa indisponível permite tentar novamente ou informar o real.
- Principal, encargos e desembolso continuam separados. A revisão é obrigatória
  com encargos, inclusive quando a revisão geral está desativada. O saldo da conta
  diminui somente pelo principal; o histórico preserva os encargos registrados.

## API e banco

`POST /api/accounts/:id/payments/preview`, com `{ valor, pagoEm }`, retorna
`{ preview }`. Valida UUID, proprietário, payload estrito, data e saldo. Consulta
a integração de taxas existente e reutiliza o cálculo Decimal, sem gravar pagamento.
Valor e data alterados invalidam a prévia anterior. Consultas antigas são canceladas.

Migração aditiva `20261102010000_tipo_conta_padrao` acrescenta somente a coluna
da preferência. O Docker aplica a migração automaticamente; não há perda de dados.

## Validação

- Backend: 246 testes passaram com PostgreSQL isolado, incluindo autorização,
  prévia sem escrita, juros proporcionais, datas, precisão e indisponibilidade.
- Frontend: 109 testes passaram, incluindo inclusão automática, remoção dos encargos,
  revisão, ajuste manual, repetição com mesma chave, preferências e cadastro.
- Builds TypeScript/Vite e imagens Docker passaram; stack principal saudável.
- Chrome desktop/mobile: cadastro real, login com e-mail preenchido, configurações
  persistidas após reload, tipo padrão em nova conta e pagamento parcial com
  encargos automáticos foram verificados até o histórico e o saldo no banco.
- Axe: nenhuma violação nas regras WCAG A/AA executadas para cadastro com erro,
  configurações e modal de encargos nos estados exercitados. Essa checagem
  automatizada não equivale a uma auditoria completa de acessibilidade.

O teste `frontend/tests/browser/settings-charges.cjs` exige projeto Compose
`saldo-smoke-*`, `SALDO_UI_URL` isolada e ferramentas externas em `SALDO_QA_TOOLS`.
Usa taxa fictícia de 15% somente no banco descartável, sem modificar o cache
do projeto principal. As capturas são salvas no diretório externo de QA.
