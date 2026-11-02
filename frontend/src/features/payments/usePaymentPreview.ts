import { useEffect, useState } from 'react';
import { api } from '../../services/api';

export type PaymentPreview = { valor: number; pagoEm: string; aviso: string } & (
  { status: 'disponivel'; encargos: string; total: string; dias: number; taxaAnual?: number; fonte?: string; desatualizada?: boolean }
  | { status: 'indisponivel'; message: string }
);

export function usePaymentPreview(accountId: string, value: number, date: string, enabled: boolean) {
  const [result, setResult] = useState<{ key: string; preview: PaymentPreview }>();
  const [failure, setFailure] = useState<{ key: string; message: string }>();
  const [revision, setRevision] = useState(0);
  const valid = Number.isFinite(value) && value > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);
  const key = `${accountId}:${value}:${date}:${revision}`;
  useEffect(() => {
    if (!enabled || !valid || result?.key === key) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api<{ preview: PaymentPreview }>(`/accounts/${accountId}/payments/preview`, {
        method: 'POST', body: JSON.stringify({ valor: value, pagoEm: date }), signal: controller.signal
      }).then(response => {
        if (!controller.signal.aborted) setResult({ key, preview: response.preview });
      }).catch(error => {
        if (!controller.signal.aborted) setFailure({ key, message: error.message });
      });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [accountId, value, date, enabled, valid, key, result?.key]);
  return {
    preview: result?.key === key ? result.preview : undefined,
    error: failure?.key === key ? failure.message : '',
    loading: enabled && valid && result?.key !== key && failure?.key !== key,
    retry: () => setRevision(value => value + 1)
  };
}
