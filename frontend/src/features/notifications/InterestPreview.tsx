import type {Estimate} from './notifications.api';
import {currency} from '../accounts/accounts.api';
import {displayTimestamp} from '../../services/dates';
import {Icon} from '../../components/Icon';
export function InterestPreview({estimate,loading,error,onRetry,compact=false}:{estimate?:Estimate;loading?:boolean;error?:string;onRetry?:()=>void;compact?:boolean}){
 return <aside className={`interest-preview${compact?' interest-compact':''}`} aria-label="Estimativa de juros de atraso"><div className="interest-heading"><Icon name="clock"/><strong>{estimate?`${estimate.dias} dia(s) de atraso`:'Conta em atraso'}</strong><span>Juros estimados</span></div>
 {loading?<p role="status">Consultando juros…</p>:estimate?.status==='disponivel'?<><div className="interest-values"><div><span>Juros estimados</span><strong>+ {currency(estimate.juros)}</strong></div><div><span>Total estimado</span><strong>{currency(estimate.valorEstimado)}</strong></div></div><p>Selic {estimate.taxaAnual.toLocaleString('pt-BR')}% a.a.{estimate.fonte?` · ${estimate.fonte}`:''}</p>{!compact&&estimate.consultadaEm&&<p>Consulta: {displayTimestamp(estimate.consultadaEm)}{estimate.emCache?' · Taxa em cache':''}</p>}{estimate.desatualizada&&<p className="rate-warning">Última taxa conhecida; atualização ainda indisponível.</p>}</>:<p>{error||'A taxa está indisponível no momento. O saldo principal é mantido.'}{onRetry&&<button type="button" onClick={onRetry}>Consultar novamente</button>}</p>}
 {!compact&&<p className="interest-disclaimer">Simulação demonstrativa sobre o saldo pendente. Não é cobrança contratual e não será adicionada automaticamente ao pagamento.</p>}
 </aside>;
}
