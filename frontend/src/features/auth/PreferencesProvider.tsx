import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {api} from '../../services/api';
export type Preferences={ordenacaoContas:'vencimento'|'valor'|'descricao';confirmarPagamento:boolean;reduzirMovimento:boolean};
export const defaultPreferences:Preferences={ordenacaoContas:'vencimento',confirmarPagamento:true,reduzirMovimento:false};
const context=createContext({preferences:defaultPreferences,loading:false,error:'',save:async(_p:Preferences)=>{},reload:()=>{}});
export function PreferencesProvider({children}:{children:ReactNode}){
 const [preferences,setPreferences]=useState(defaultPreferences),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);api<{preferences:Preferences}>('/users/me/preferences').then(r=>{if(active){setPreferences(r.preferences??defaultPreferences);setError('');}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[revision]);
 useEffect(()=>{document.documentElement.dataset.reduceMotion=String(preferences.reduzirMovimento);return()=>{delete document.documentElement.dataset.reduceMotion;};},[preferences.reduzirMovimento]);
 async function save(input:Preferences){const r=await api<{preferences:Preferences}>('/users/me/preferences',{method:'PUT',body:JSON.stringify(input)});setPreferences(r.preferences);setError('');}
 return <context.Provider value={{preferences,loading,error,save,reload:()=>setRevision(v=>v+1)}}>{children}</context.Provider>;
}
export const usePreferences=()=>useContext(context);
