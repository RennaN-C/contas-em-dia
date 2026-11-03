export function downloadText(contents:string,filename:string,type:string){
  const url=URL.createObjectURL(new Blob([contents],{type}));
  const link=document.createElement('a');link.href=url;link.download=filename;
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);
}
