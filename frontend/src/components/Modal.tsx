import {useEffect,useRef,useId,type ReactNode} from 'react';
export function Modal({title,children,onClose,busy=false,role='dialog'}:{title:string;children:ReactNode;onClose:()=>void;busy?:boolean;role?:'dialog'|'alertdialog'}){
  const ref=useRef<HTMLDialogElement>(null), titleId=useId();
  const closeRef=useRef(onClose);closeRef.current=onClose;
  useEffect(()=>{
    const dialog=ref.current!,previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;
    if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
    document.body.style.overflow='hidden';
    return()=>{if(typeof dialog.close==='function')dialog.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
  },[]);
  return <dialog ref={ref} className="app-modal" role={role} aria-modal="true" aria-labelledby={titleId} onCancel={e=>{e.preventDefault();if(!busy)closeRef.current();}}>
    <div className="modal-heading"><h2 id={titleId}>{title}</h2><button type="button" className="modal-close" aria-label="Fechar janela" disabled={busy} onClick={onClose}>×</button></div><div className="modal-body">{children}</div>
  </dialog>;
}
