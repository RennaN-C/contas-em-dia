import { api } from '../../services/api';
import type { Account } from './accounts.api';
import type { Payment } from '../payments/Payments';
export type MonthlyReport = {
  mes:string; geradoEm:string; usuario:{nome:string;email:string};
  totais:{previsto:number;saldoPendente:number;principalPago:number;encargos:number;totalPago:number};
  contas:Account[];pagamentos:Payment[];
  categorias:{categoria:string;previsto:number;principalPago:number;encargos:number;saldoPendente:number}[];
};
export const reportsApi={monthly:(month:string)=>api<{report:MonthlyReport}>(`/accounts/reports/monthly?mes=${encodeURIComponent(month)}`)};
