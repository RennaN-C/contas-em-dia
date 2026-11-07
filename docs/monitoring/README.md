# Monitoramento local opcional

O Compose padrão continua com aplicação e banco. Para coletar métricas:

```powershell
$env:METRICS_ENABLED='true'
docker compose --profile monitoring up -d --build --wait
```

Prometheus: http://127.0.0.1:9090. Grafana: http://127.0.0.1:3001; login inicial admin/admin, com troca obrigatória na primeira entrada. Portas vinculadas somente a loopback; não publique esses serviços por túnel. O dashboard Saldo+ é provisionado automaticamente. Os volumes preservam os dados.

O scrape usa `/internal/metrics` com Bearer. A credencial `saldo-monitoramento-local` é apenas para este ambiente local. Para outro ambiente, gerar segredo em `.env`/cofre e ajustar `authorization.credentials` na configuração privada do Prometheus, sem versionar esse segredo. O endpoint fica 404 se desabilitado ou sem token de pelo menos 16 caracteres; se habilitado, token ausente/incorreto recebe 401. Não adicionar proxy público para essa rota.

Métricas: requisições por método/padrão de rota/status, histograma de latência, execuções/falhas de jobs; contagens persistidas de mensagens por estado, tentativas, retentativas e interações. Contadores HTTP/jobs reiniciam com o processo; gauges de mensageria são reconstruídos do PostgreSQL. Labels nunca incluem IDs, códigos, URLs completas, conteúdo financeiro ou credenciais.

Conferência: Targets do Prometheus deve mostrar `saldo-api` UP; fazer login no Saldo+ e atualizar o perfil; o gráfico de requisições deve mudar. Interações simuladas e testes reais criam registros para as métricas Discord. Sem bot configurado, contagens zero são esperadas. Não confundir coleta local com monitoramento validado no Azure.
