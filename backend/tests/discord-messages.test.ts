import { expect, it } from 'vitest';
import { formatDueReminder } from '../src/integrations/discord/messages.js';

it.each([[3, 'em 3 dias'], [1, 'amanhã'], [0, 'hoje']])('formata prazo de %i dia(s) sem ambiguidade', (days, deadline) => {
  const text = formatDueReminder({ description: 'Internet — apresentação', remaining: 129.9, due: new Date('2026-11-09T00:00:00Z'), days });
  expect(text).toContain(`**${deadline}**`);
  expect(text).toContain('Internet — apresentação');
  expect(text).toContain('129,90'); expect(text).toContain('09/11/2026');
  expect(text).toContain('não registra pagamento');
  expect(text).not.toContain('dia(s)');
});
it('preserva acentos e impede descrição de alterar a formatação dos campos', () => {
  const text = formatDueReminder({ description: '**Água**\n@everyone', remaining: 60, due: new Date('2026-11-09'), days: 3 });
  expect(text).toContain('\\*\\*Água\\*\\* @everyone');
  expect(text).not.toContain('Água**\n');
});
