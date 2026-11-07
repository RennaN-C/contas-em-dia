# Operação local validada

O SaldoPlusBot criado pelo usuário foi autenticado na API oficial; Application ID e Public Key conferem, e o bot está instalado no servidor informado no `.env`. Os quatro comandos foram registrados. O Discord aceitou o Interactions Endpoint HTTPS, validando o PING assinado.

Validação real, autorizada pelo usuário: vínculo concluído pelo comando `/vincular`, uma DM de teste sem dados financeiros enviada em uma tentativa com ID externo registrado e clique em **Confirmar recebimento** persistido como `respondida`, com data de resposta. A confirmação não registrou pagamento.

Avisos reais usam os mesmos jobs do Saldo+: D−3/D−1/D às 06h, resumo semanal segunda-feira às 06h05, recuperação a cada quinze minutos e fila Discord a cada cinco segundos, no fuso America/Sao_Paulo. Eventos atuais já existentes internamente podem ser enviados após o vínculo; chaves únicas impedem repetição. Datas antigas recuperadas não são enviadas ao Discord. Pagamentos parciais são descontados ao montar o aviso. O resumo semanal atual teve envio real confirmado.

Para a apresentação, o usuário solicitou uma conta avulsa de exemplo vencendo em três dias. A conta foi criada pelo service financeiro e o aviso D−3 foi enviado pelo fluxo real, com ID Discord registrado. A mensagem usa campos separados para conta, valor restante e data brasileira, acentos corretos e botão verde. Confirmar o aviso altera a mensagem para `respondida`, preservando os pagamentos.

Para consultar os avisos atuais manualmente, usar **Atualizar avisos** na central de avisos do Saldo+. Os jobs e a API existente fazem o enfileiramento sem recriar despesas ou pagamentos. Só usuários com vínculo ativo recebem DMs. DMs bloqueadas geram falha visível no Perfil e inativam o vínculo.

O aplicativo está em http://localhost:5174. O webhook usa o perfil Docker `discord`; para iniciar/reconectar:

```powershell
cd C:\ContasEmDia\backend
npm run discord:local
```

O Quick Tunnel depende de Docker e conexão com a internet. Sua URL muda se o túnel for recriado; o comando acima registra novamente a URL correta. Isso é desenvolvimento local, sem deploy Azure. O bot pode aparecer offline na lista do Discord porque não usa uma conexão Gateway; os comandos e as DMs funcionam pelo modelo HTTP.

Segredos reais permanecem somente no `.env` local, fora do Git. Nenhum token, chave de criptografia, código de convite ou dado financeiro pessoal é publicado nesta evidência.
