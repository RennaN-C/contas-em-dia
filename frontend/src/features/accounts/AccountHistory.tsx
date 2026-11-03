import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { displayTimestamp } from '../../services/dates';
import { currency, displayDate } from './accounts.api';
import { categoryLabel } from './categories';
import { Pagination, PAGE_SIZE } from '../../components/Pagination';

export type HistoryEntry = { id: string; descricao: string; acao: string; criadoEm: string; contaId: string|null; detalhes: { antes?: Record<string,unknown>; depois?: Record<string,unknown>; observacao?: string; valor?: string; encargos?: string; pagoEm?: string } };
const actions: Record<string,string> = { CONTA_CRIADA: 'Conta cadastrada', CONTA_EDITADA: 'Conta editada', CONTA_EXCLUIDA: 'Conta excluída', RECORRENCIA_GERADA: 'Mensalidade prevista', RECORRENCIA_PAUSADA: 'Recorrência pausada', RECORRENCIA_RETOMADA: 'Recorrência retomada', PAGAMENTO_REGISTRADO: 'Pagamento registrado', CADASTRO_ANTERIOR: 'Cadastro anterior ao histórico' };
const fields: Record<string,string> = { descricao: 'Descrição', valor: 'Valor', vencimento: 'Vencimento', tipo: 'Tipo', categoria: 'Categoria', recorrenciaAtiva: 'Recorrência ativa' };
function displayValue(key: string, value: unknown) {
  if (key === 'valor') return currency(String(value));
  if (key === 'vencimento') return displayDate(String(value));
  if (key === 'categoria') return categoryLabel(String(value));
  if (key === 'tipo') return value === 'RECORRENTE' ? 'Recorrente mensal' : 'Avulsa';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  return String(value ?? '—');
}
export function AccountHistory({ accountId }: { accountId?: string }) {
  const [rows,setRows] = useState<HistoryEntry[]>([]), [loading,setLoading] = useState(true), [error,setError] = useState(''), [retry,setRetry] = useState(0);
  const [page,setPage] = useState(1);
  const currentPage=Math.min(page,Math.max(1,Math.ceil(rows.length/PAGE_SIZE)));
  useEffect(() => { let active=true;setLoading(true);setError('');api<{history:HistoryEntry[]}>(`/accounts/${accountId?`${accountId}/`:''}history`).then(result=>{if(active)setRows(result.history);}).catch(error=>{if(active)setError(error.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;}; },[accountId,retry]);
  return <section aria-label="Histórico de alterações"><h2>Histórico de alterações</h2>{loading?<p role="status">Carregando histórico…</p>:error?<p role="alert">{error} <button onClick={()=>setRetry(value=>value+1)}>Tentar novamente</button></p>:!rows.length?<p>Nenhuma alteração registrada.</p>:<><ol className="account-timeline">{rows.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE).map(row=><li key={row.id}>
    <div><strong>{actions[row.acao]??'Atualização da conta'}</strong><time dateTime={row.criadoEm}>{displayTimestamp(row.criadoEm)}</time></div>{!accountId&&<p>{row.descricao}</p>}
    {row.detalhes.observacao&&<p>{row.detalhes.observacao}</p>}
    {row.acao==='PAGAMENTO_REGISTRADO'&&<p>Principal: {currency(row.detalhes.valor??0)} · Encargos: {currency(row.detalhes.encargos??0)}{row.detalhes.pagoEm?` · Pago em ${displayDate(row.detalhes.pagoEm)}`:''}</p>}
    {row.detalhes.depois&&<dl>{Object.entries(row.detalhes.depois).filter(([key,value])=>(key!=='recorrenciaAtiva'||row.detalhes.depois?.tipo==='RECORRENTE')&&(!row.detalhes.antes||row.detalhes.antes[key]!==value)).map(([key,value])=><div key={key}><dt>{fields[key]??key}</dt><dd>{row.detalhes.antes&&<><del>{displayValue(key,row.detalhes.antes[key])}</del><span aria-hidden="true"> → </span></>}{displayValue(key,value)}</dd></div>)}</dl>}
  </li>)}</ol><Pagination page={currentPage} total={rows.length} onChange={setPage} label="Paginação do histórico de alterações"/></>}</section>;
}
