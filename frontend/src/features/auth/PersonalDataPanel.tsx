import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../services/api';
import { downloadText } from '../../services/download';
import { currency } from '../accounts/accounts.api';
import { AccountHistory } from '../accounts/AccountHistory';
import { todayISO } from '../../services/dates';

type Summary={contas:number;quitadas:number;atrasadas:number;saldoPendente:number;pagamentos:number;totalPago:number;mensagensNaoLidas:number};
export function PersonalDataPanel(){
  const [data,setData]=useState<Summary>(),[error,setError]=useState(''),[revision,setRevision]=useState(0),[downloading,setDownloading]=useState(false),[feedback,setFeedback]=useState(''),[downloadError,setDownloadError]=useState(''),[activity,setActivity]=useState(false);
  useEffect(()=>{let active=true;setError('');setData(undefined);api<{summary:Summary}>('/users/me/summary').then(result=>{if(!result.summary)throw new Error('Resumo pessoal indisponível');if(active)setData(result.summary);}).catch(error=>{if(active)setError(error.message);});return()=>{active=false;};},[revision]);
  async function download(){setDownloading(true);setFeedback('');setDownloadError('');try{const result=await api<{usuario:{id:string}}>('/users/me/export');if(!result.usuario?.id)throw new Error('Não foi possível preparar seus dados');downloadText(JSON.stringify(result,null,2),`saldo-plus-meus-dados-${todayISO()}.json`,'application/json;charset=utf-8');setFeedback('Exportação preparada. Guarde o arquivo em um local privado.');}catch(error){setDownloadError((error as Error).message);}finally{setDownloading(false);}}
  return <div className="personal-data-panels"><section className="panel"><h2>Seu controle financeiro</h2>{error?<p role="alert">{error} <button onClick={()=>setRevision(value=>value+1)}>Atualizar resumo</button></p>:!data?<p role="status">Carregando resumo pessoal…</p>:<><dl className="profile-summary"><div><dt>Contas cadastradas</dt><dd>{data.contas}</dd></div><div><dt>Contas quitadas</dt><dd>{data.quitadas}</dd></div><div><dt>Em atraso</dt><dd>{data.atrasadas}</dd></div><div><dt>Pagamentos registrados</dt><dd>{data.pagamentos}</dd></div><div><dt>Saldo pendente</dt><dd>{currency(data.saldoPendente)}</dd></div><div><dt>Total desembolsado</dt><dd>{currency(data.totalPago)}</dd></div></dl><Link className="text-link" to="/avisos">{data.mensagensNaoLidas} mensagem(ns) não lida(s) →</Link></>}</section>
    <section className="panel"><h2>Privacidade e seus dados</h2><p>Baixe uma cópia das suas contas, pagamentos, preferências, mensagens e histórico. A exportação não inclui sua senha ou token de acesso.</p><p className="field-hint">O arquivo contém informações financeiras pessoais. A exportação permite consultar seus dados; não há restauração automática por este arquivo.</p>{downloadError&&<p role="alert">{downloadError}</p>}{feedback&&<p role="status" className="feedback-success">{feedback}</p>}<button disabled={downloading} onClick={download}>{downloading?'Preparando arquivo…':'Baixar meus dados (JSON)'}</button></section>
    <section className="panel"><h2>Atividade das suas contas</h2><p>Consulte cadastros, edições, pagamentos e mudanças de recorrência, inclusive de contas excluídas depois da ativação do histórico.</p><button aria-expanded={activity} onClick={()=>setActivity(value=>!value)}>{activity?'Ocultar atividade':'Consultar atividade'}</button>{activity&&<AccountHistory/>}</section>
  </div>;
}
