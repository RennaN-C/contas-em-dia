import { useEffect, useState } from 'react';
import { todayISO, displayTimestamp } from '../services/dates';
import { reportsApi, type MonthlyReport } from '../features/accounts/reports.api';
import { currency, displayDate } from '../features/accounts/accounts.api';
import { categoryLabel } from '../features/accounts/categories';
import { accountStatusLabel } from '../features/accounts/accounts.report';
import { CategoryChart } from '../features/accounts/CategoryChart';
import { usePreferences } from '../features/auth/PreferencesProvider';
import { paymentTotal } from '../features/payments/Payments';
import { ScrollableTable } from '../components/ScrollableTable';

export function ReportsPage(){
  const {preferences}=usePreferences();
  const [month,setMonth]=useState(todayISO().slice(0,7)),[data,setData]=useState<MonthlyReport>(),[error,setError]=useState(''),[retry,setRetry]=useState(0),[details,setDetails]=useState<boolean>();
  const detailed=details??preferences.detalhesRelatorio;
  useEffect(()=>{let active=true;setData(undefined);setError('');reportsApi.monthly(month).then(result=>{if(active)setData(result.report);}).catch(error=>{if(active)setError(error.message);});return()=>{active=false;};},[month,retry]);
  const monthName=new Date(`${month}-01T12:00:00Z`).toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'});
  return <section className="page monthly-report"><div className="page-heading"><div><span className="eyebrow">SEU MÊS EM NÚMEROS</span><h1 className="page-title">Relatório mensal</h1><p className="page-description">Compromissos, pagamentos e gastos por categoria, com os valores registrados no sistema.</p></div><button className="button no-print" disabled={!data||!!error} onClick={()=>window.print()}>Imprimir / Salvar PDF</button></div>
    <div className="table-toolbar no-print"><label>Mês do relatório<input type="month" min="1900-01" max="9998-12" value={month} onChange={event=>{const value=event.target.value;if(/^\d{4}-(0[1-9]|1[0-2])$/.test(value)&&Number(value.slice(0,4))>=1900&&Number(value.slice(0,4))<=9998)setMonth(value);}}/></label><label className="setting-option"><input type="checkbox" checked={detailed} onChange={event=>setDetails(event.target.checked)}/><span>Incluir contas e pagamentos detalhados</span></label></div>
    <p className="field-hint no-print">Para gerar o PDF, escolha “Salvar como PDF” na janela de impressão do navegador.</p>
    {error?<p role="alert">{error} <button onClick={()=>setRetry(value=>value+1)}>Tentar novamente</button></p>:!data?<p role="status">Preparando relatório…</p>:<>
      <header className="report-identification"><h2>Saldo + · {monthName}</h2><p>{data.usuario.nome} · {data.usuario.email}</p><p>Gerado em {displayTimestamp(data.geradoEm)} · Valores em reais (BRL)</p></header>
      <dl className="results-summary report-totals"><div><dt>Previsto para vencer no mês</dt><dd>{currency(data.totais.previsto)}</dd></div><div><dt>Saldo dessas contas, hoje</dt><dd>{currency(data.totais.saldoPendente)}</dd></div><div><dt>Principal pago no mês</dt><dd>{currency(data.totais.principalPago)}</dd></div><div><dt>Encargos pagos no mês</dt><dd>{currency(data.totais.encargos)}</dd></div></dl>
      <p className="report-total">Total desembolsado no mês <strong>{currency(data.totais.totalPago)}</strong></p>
      <p className="report-method">Previsto e saldo consideram as contas com vencimento neste mês. Principal e encargos consideram a data de cada pagamento, inclusive de contas de outros meses. O saldo é o atual e pode incluir pagamentos posteriores ao mês; não representa um fechamento histórico.</p>
      <CategoryChart title="Gastos pagos por categoria" description="Principal e encargos efetivamente registrados na data de pagamento deste mês." rows={data.categorias.map(row=>({categoria:row.categoria,valor:(Math.round(row.principalPago*100)+Math.round(row.encargos*100))/100}))}/>
      <ScrollableTable className="report-category-table" label="Tabela de resumo por categoria"><table><caption>Resumo por categoria</caption><thead><tr><th>Categoria</th><th>Previsto</th><th>Principal pago</th><th>Encargos</th><th>Saldo atual</th></tr></thead><tbody>{data.categorias.map(row=><tr key={row.categoria}><th scope="row">{categoryLabel(row.categoria)}</th><td>{currency(row.previsto)}</td><td>{currency(row.principalPago)}</td><td>{currency(row.encargos)}</td><td>{currency(row.saldoPendente)}</td></tr>)}</tbody></table>{!data.categorias.length&&<p>Nenhuma movimentação neste mês.</p>}</ScrollableTable>
      {detailed&&<><h2>Contas com vencimento no mês</h2>{!data.contas.length?<p>Nenhuma conta com vencimento neste mês.</p>:<ScrollableTable label="Tabela de contas do mês"><table><thead><tr><th>Conta</th><th>Categoria</th><th>Vencimento</th><th>Valor</th><th>Saldo atual</th><th>Status atual</th></tr></thead><tbody>{data.contas.map(row=><tr key={row.id}><td>{row.descricao}</td><td>{categoryLabel(row.categoria)}</td><td>{displayDate(row.vencimento)}</td><td>{currency(row.valor)}</td><td>{currency(row.saldo)}</td><td>{accountStatusLabel(row.status)}</td></tr>)}</tbody></table></ScrollableTable>}
      <h2>Pagamentos realizados no mês</h2>{!data.pagamentos.length?<p>Nenhum pagamento neste mês.</p>:<ScrollableTable label="Tabela de pagamentos do mês"><table><thead><tr><th>Conta</th><th>Data</th><th>Principal</th><th>Encargos</th><th>Total</th></tr></thead><tbody>{data.pagamentos.map(row=><tr key={row.id}><td>{row.conta.descricao}</td><td>{displayDate(row.pagoEm)}</td><td>{currency(row.valor)}</td><td>{currency(row.encargos??0)}</td><td>{currency(paymentTotal(row))}</td></tr>)}</tbody></table></ScrollableTable>}</>}
      <footer className="report-footer">Relatório de controle pessoal do Saldo +. Encargos apresentados são os registrados como pagos; simulações de juros não são somadas a estes valores.</footer>
    </>}
  </section>;
}
