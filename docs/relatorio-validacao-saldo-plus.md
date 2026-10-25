# Relatório de validação — Saldo +

Data: 25/10/2026, America/Sao_Paulo. Responsável: Rennan.
PR: [#35](https://github.com/RennaN-C/contas-em-dia/pull/35), destino `develop`.

## Resultado

Os **212 testes originais foram reexecutados e aprovados** antes das mudanças
visuais. A suíte final tem **224 testes aprovados: 166 backend + 58 frontend**,
incluindo **21 testes com PostgreSQL real**. Os 12 testes adicionais cobrem as
agregações/gráficos do painel, carregamento, falha e recuperação e uma condição
de concorrência no resumo semanal. TypeScript e builds backend/frontend aprovados.

O teste de usuário no **Google Chrome instalado, automatizado pelo Playwright
em modo headless**, concluiu **25 verificações**, incluindo **8 auditorias
automáticas de acessibilidade sem violações** nas regras WCAG 2 A/AA e 2.1 AA
aplicáveis pelo axe. As capturas foram inspecionadas. Isso não equivale a uma
certificação completa de acessibilidade ou teste manual com leitor de tela.

## Ambiente e isolamento

- Suítes backend: PostgreSQL 15, banco exclusivo `contas_rennan_test`, porta 55432.
- Fluxo Chrome: outro banco exclusivo, `saldo_plus_e2e`, API na porta 3001 e
  frontend na porta 5175. Migrações aplicadas sem reset ou perda de dados.
- Aplicação de desenvolvimento: frontend em `http://localhost:5174`, API na porta
  3000, banco `contasedia` na porta 55433, preservados fora do fluxo automatizado.
- Cada execução no Chrome registra um usuário fictício próprio; nenhuma conta
  pessoal é usada. A autenticação, as contas e os pagamentos passam pela API real.
- Playwright e axe foram instalados em diretório temporário, fora do projeto.
  Nenhuma dependência foi adicionada à aplicação.

## Ciclo testado como usuário

| Ação | Evidência e resultado |
| --- | --- |
| Abrir cadastro, preencher nome/e-mail/senha e enviar | Cadastro persistido e confirmação visível |
| Entrar com o usuário cadastrado | JWT emitido, navegação e painel acessíveis |
| Abrir painel sem contas | Estado vazio com chamada para cadastrar; nenhum valor fictício |
| Cadastrar conta atrasada de R$ 100,00 | Conta avulsa com vencimento 30 dias antes da data UTC atual |
| Cadastrar conta de R$ 120,00 para daqui a 3 dias | Conta visível no filtro e na previsão semanal |
| Pesquisar uma descrição inexistente e limpar | Vazio coerente e recuperação da listagem |
| Executar job diário para o vencimento anterior e repetir | Exatamente um aviso e uma mensagem para o evento |
| Executar resumo semanal | Uma mensagem persistida, contendo somente a conta elegível de R$ 120,00 |
| Marcar aviso como lido e recarregar a página | Leitura preservada no banco e refletida na interface |
| Registrar pagamento parcial de R$ 40,00 pela interface | Saldo R$ 60,00, status atrasada e um pagamento no histórico |
| Consultar juros reais | Mantidos saldo R$ 60,00 e 30 dias; Selic real indisponível, sem taxa inventada |
| Exibir juros com resposta simulada, em cenário separado | 15% a.a. sobre R$ 60,00 por 30 dias: R$ 0,74 e total R$ 60,74 |
| Consultar pagamentos e perfil | Dados reais do usuário e pagamento visível |
| Retornar ao painel | R$ 180,00 pendentes, R$ 40,00 pagos e R$ 60,00 em atraso |
| Abrir tabela do gráfico | Meses e valores exatos disponíveis como alternativa ao gráfico |
| Navegar em celular | Menu abre/fecha; sem rolagem horizontal em 390px e 320px |
| Sair e tentar abrir `/avisos` | Sessão removida e redirecionamento para login |

Jobs foram disparados pelo comando administrativo existente, nunca por endpoint
HTTP adicional. O aviso histórico é uma recuperação explícita do dia do
vencimento; o job diário normal continua considerando a data UTC de execução.
Mensagens guardam o conteúdo do momento de sua geração: o aviso de R$ 100,00
continua como histórico após o pagamento, enquanto o saldo e os juros atuais
passam a considerar R$ 60,00.

## BrasilAPI: resultado real e limite externo

A consulta direta a `https://brasilapi.com.br/api/taxas/v1/Selic` retornou
**HTTP 500**, com o conteúdo:

```json
{"message":"Parse error","type":"internal_error","name":"Error"}
```

O caminho real backend → BrasilAPI → interface foi exercitado. O sistema
retornou `indisponivel`, manteve saldo e dias e ofereceu nova tentativa, sem
interromper mensagens, pagamentos ou resumo. **Não foi possível validar uma taxa
real com sucesso enquanto esse erro externo persistiu.**

A fórmula foi aprovada nos testes de serviço e integração PostgreSQL com mocks.
Além disso, o Chrome exercitou separadamente a renderização de uma resposta
controlada, explicitamente simulada em teste, com juros de R$ 0,74. Essa resposta
não foi tratada como uma cotação real e não altera a configuração da aplicação.

## Alterações e correções verificadas

- Identidade **Saldo +**, favicon próprio, navegação e telas de acesso renovadas.
- Painel com saldos reais, histórico de seis meses em gráfico de barras,
  distribuição entre pago/a vencer/atraso e lista de contas para acompanhar.
- Gráficos SVG/CSS, tabela de valores, cartões, busca de contas, indicadores de
  status, feedback, foco visível, efeitos suaves e respeito a `prefers-reduced-motion`.
- Responsividade verificada em 1440×1000, 390×844 e 320×740; auditorias em desktop
  e mobile. Sem erros JavaScript registrados no fluxo final.
- Contraste corrigido após as primeiras auditorias do cadastro e do painel.
- Corrigida a condição em que um usuário era removido entre a seleção inicial
  do resumo e a obtenção do lock: agora ele é ignorado sem violar a FK. Teste
  de regressão adicionado; última suíte backend sem o erro de concorrência.
- Autenticação, chaves de sessão existentes, recorrência, histórico e contratos
  da API foram preservados. Nenhuma nova migração exigida pela atualização visual.

## Evidências

- [Resultado estruturado do Chrome](qa/results.json)
- [Painel desktop](qa/saldo-plus-dashboard.png)
- [Painel mobile](qa/saldo-plus-mobile-dashboard.png)
- [Contas](qa/saldo-plus-contas.png)
- [Avisos desktop](qa/saldo-plus-avisos.png)
- [Avisos mobile](qa/saldo-plus-mobile-avisos.png)
- [Cadastro](qa/saldo-plus-cadastro.png)
- [Roteiro automatizado do usuário](../frontend/tests/browser/user-flow.cjs)

## Reproduzir o teste no navegador

Com API/frontend exclusivos já iniciados e um banco de QA migrado, configure
as variáveis abaixo. O teste cria dados apenas no ambiente apontado pela API;
use sempre um banco exclusivo.

```powershell
$qaTools = Join-Path $env:TEMP 'saldo-plus-qa'
npm install --prefix $qaTools --no-save playwright @axe-core/playwright
$env:SALDO_QA_TOOLS = $qaTools
$env:SALDO_UI_URL = 'http://127.0.0.1:5175'
$env:SALDO_API_URL = 'http://127.0.0.1:3001/api'
$env:DATABASE_URL = 'postgresql://teste:teste_local@localhost:55432/saldo_plus_e2e'
# JWT_SECRET deve corresponder ao backend de QA.
# SALDO_CHROME pode indicar outro executável Chrome instalado.
node frontend/tests/browser/user-flow.cjs
```

O JSON e as capturas são atualizados em `docs/qa/`. Os 25 passos do navegador
são adicionais aos 224 testes Vitest e não estão incluídos nessa contagem.

## Integração

A falha externa da Selic foi tratada conforme os critérios das issues #29/#30;
não bloqueou os fluxos internos. Resultado técnico: aprovado para integração em
`develop`, conforme autorizado. O estado definitivo da integração e do
encerramento das issues #22–#32 pode ser consultado na PR #35 e nas próprias
issues. O encerramento é condicionado à confirmação do merge. Sem deploy de produção.
