type DueReminder = { description: string; remaining: number; due: Date; days: number };

export function formatDueReminder({ description, remaining, due, days }: DueReminder) {
  let deadline = 'hoje';
  if (days === 1) deadline = 'amanhã';
  if (days > 1) deadline = `em ${days} dias`;
  const name = description.replaceAll(/[\r\n]+/g, ' ').replaceAll(/[\\`*_~|>]/g, '\\$&');
  const money = remaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const date = due.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  return [
    '🔔 **Saldo+ • Lembrete de vencimento**', '',
    `Sua conta vence **${deadline}**.`, '',
    `🧾 **Conta:** ${name}`,
    `💰 **Valor restante a pagar:** ${money}`,
    `📅 **Vencimento:** ${date}`, '',
    'Acompanhe esta despesa pelo **Saldo+**.',
    'Toque no botão abaixo para confirmar que recebeu o aviso.', '',
    '_Confirmar recebimento não registra pagamento._'
  ].join('\n');
}
