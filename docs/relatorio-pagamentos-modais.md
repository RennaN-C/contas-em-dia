# Saldo + — juros à vista, pagamentos em modal e preferências

Data: 25/10/2026. Responsável: Rennan. Branch/PR: `feat/saldo-plus-apresentacao`,
[#36](https://github.com/RennaN-C/contas-em-dia/pull/36).

## Entrega

- Conta atrasada evidencia juros estimados, dias, taxa/fonte e total estimado
  diretamente no cartão, além de manter a central de avisos.
- Cartões com ações curtas e alinhadas: **Pagar**, **Editar**, **Pagamentos**.
  Pausa/retomada e exclusão são secundárias; filtros têm alturas/alinhamento consistentes.
- Cadastro/edição de conta, pagamento, histórico, registro, exclusão e edição
  de perfil usam modais centrais acessíveis. Foco permanece no modal, Escape
  fecha quando não há gravação e o foco retorna ao botão de origem.
- No pagamento, o usuário vê principal, estimativa e eventual indisponibilidade.
  A preferência padrão exige revisão antes da gravação; o sistema não transforma
  uma simulação em cobrança automaticamente.
- Campo opcional de **encargos efetivamente pagos**, separado do principal;
  confirmação, registro, histórico e CSV mostram a discriminação e o total.
- Após o registro, **Consultar histórico** permite conferir o pagamento.
  Na tabela, **Ver registro** abre data, principal, encargos, total e identificador.
- Perfil com resumo pessoal, edição em modal e acesso às configurações.
  Cadastro com etapas informativas, orientações de senha e confirmação.
- Configurações persistidas por usuário: ordenação inicial das contas,
  confirmação de pagamento e redução de animações, com referências financeiras
  claras sobre moeda, calendário e juros.

## Regra financeira preservada

Juros calculados com Selic continuam **estimados**. `valor` do pagamento amortiza
o principal; `encargos` registra somente juros/multa que o usuário informou ter
efetivamente pago. Exemplo: principal pago R$ 40,00 + encargos reais R$ 0,90
produzem registro de R$ 40,90; numa conta de R$ 100,00, o saldo principal passa
a R$ 60,00. A estimativa nunca é acrescentada automaticamente a esse saldo.

A validação de saldo, transação, histórico e idempotência anteriores permanecem.
Repetir a chave com encargos diferentes retorna conflito; encargos negativos ou
com precisão inválida são rejeitados. Indicadores/gráficos incluem encargos
efetivamente pagos; a dívida principal continua separada.

## Validação executada

- **316 testes Vitest aprovados: 226 backend + 90 frontend**, com **38 testes
  PostgreSQL reais** em bancos isolados.
- Builds TypeScript/backend e TypeScript/Vite/frontend aprovados.
- **40 verificações no Google Chrome instalado**, headless/Playwright,
  incluindo **11 auditorias axe sem violações** nas regras WCAG A/AA aplicáveis.
- Fluxo validado: cadastro, conta, juros no cartão/modal, revisão antes de pagar,
  pagamento parcial, registro detalhado, CSV, perfil, recorrência, leitura,
  isolamento entre usuários, preferências persistentes e logout.
- Pagamento de teste: R$ 10,00 de principal + R$ 1,25 de encargos, total R$ 11,25,
  principal quitado corretamente; registro e consulta conferidos no backend.
- Navegação com Tab no modal não alcança o fundo; Escape retorna a **Nova conta**.
- Modal desktop/mobile também verificado com a conta demonstrativa local, sem
  gravar pagamento na conta de demonstração. Sem overflow em viewport de 390px.
- A CI expôs um conflito serializável transitório entre jobs e gravações.
  Pagamentos/alterações agora usam repetição limitada da transação serializável,
  preservando a chave de idempotência; regressão coberta por teste específico.

Auditorias automáticas não equivalem a certificação completa de acessibilidade.
O objetivo acordado continua sendo apresentação local, sem deploy público.

## Migração

`20261025030000_preferencias_encargos`, aditiva: `pagamentos.encargos` com padrão
zero e restrição não negativa; tabela `preferencias_usuarios` vinculada ao usuário.
Aplicada nos bancos local, de testes e de navegador, sem reset ou perda de dados.

## Evidências

- [Resultado estruturado do Chrome](qa/results.json)
- [Contas demonstrativas e botões](qa/saldo-plus-demo-contas.png)
- [Modal de pagamento desktop](qa/saldo-plus-demo-modal-pagamento.png)
- [Modal de pagamento mobile](qa/saldo-plus-demo-modal-mobile.png)
- [Tabela de pagamentos](qa/saldo-plus-demo-pagamentos.png)
- [Registro detalhado](qa/saldo-plus-demo-registro.png)
- [Modal testado com auditoria](qa/saldo-plus-modal-pagamento.png)
- [Configurações](qa/saldo-plus-configuracoes.png)

Abrir `http://localhost:5174`; credenciais da demonstração em `backend/.env`.
O código está na PR #36 para revisão, sem merge ou deploy nesta atualização.
