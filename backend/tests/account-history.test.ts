import { expect,it } from 'vitest';
import { accountSnapshot } from '../src/modules/accounts/history.service.js';
const account={descricao:'Conta',valor:'100',vencimento:new Date('2026-11-02'),tipo:'AVULSA',recorrenciaAtiva:true};
it('snapshot de avulsa não apresenta recorrência ativa',()=>{expect(accountSnapshot(account)).not.toHaveProperty('recorrenciaAtiva');expect(accountSnapshot(account)).toMatchObject({vencimento:'2026-11-02',categoria:'OUTRAS'});});
it('snapshot de recorrente preserva estado de pausa',()=>{expect(accountSnapshot({...account,tipo:'RECORRENTE',recorrenciaAtiva:false})).toHaveProperty('recorrenciaAtiva',false);});
