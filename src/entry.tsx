import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import './admin.css';
import { AdminPanel } from './admin';
import { AdminHome } from './adminHome';

const hash=window.location.hash;
const params=new URLSearchParams(window.location.search);
const isAdminRoute=params.get('admin')==='1';
const isValidatorRoute=params.get('validator')==='1'||hash==='#admin'||((hash.includes('access_token=')||hash.includes('error_description='))&&!isAdminRoute);
const isGlossaryRoute=hash==='#glossario';
const FINAL_RECEIPT_KEY='torres-em-comum:final-receipt';
const SESSION_KEY='torres-em-comum:remote-session';
const RECEIPT_URL='https://hzcpbbnjoeyyfwxdsbxt.supabase.co/functions/v1/participation-receipt';

window.addEventListener('hashchange',()=>window.location.reload());

let recovering=false;
const recoverFinalizedManifestation=()=>{
  if(recovering||!localStorage.getItem(FINAL_RECEIPT_KEY))return false;
  recovering=true;
  import('./finalRecovery').then(({renderFinalRecovery})=>renderFinalRecovery()).catch(()=>{recovering=false});
  return true;
};

const recoverReceiptFromBackend=async()=>{
  if(localStorage.getItem(FINAL_RECEIPT_KEY))return recoverFinalizedManifestation();
  let session:any=null;
  try{session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return false}
  if(!session?.participantId||!session?.resumeToken)return false;
  try{
    const response=await fetch(RECEIPT_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({participantId:session.participantId,resumeToken:session.resumeToken})});
    if(!response.ok)return false;
    const receipt=await response.json();
    if(!receipt?.ready)return false;
    localStorage.setItem(FINAL_RECEIPT_KEY,JSON.stringify({protocolId:receipt.protocolId,status:receipt.status,finalizedAt:receipt.finalizedAt,payloadHash:receipt.payloadHash,countsInPanel:receipt.countsInPanel===true,conflict:receipt.conflict||null}));
    localStorage.setItem(SESSION_KEY,JSON.stringify({...session,status:receipt.status}));
    return recoverFinalizedManifestation();
  }catch{return false}
};

window.addEventListener('error',()=>{recoverFinalizedManifestation()});
window.addEventListener('unhandledrejection',()=>{recoverFinalizedManifestation()});

if(isAdminRoute){
  ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AdminHome/></React.StrictMode>);
}else if(isValidatorRoute){
  ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AdminPanel/></React.StrictMode>);
}else if(isGlossaryRoute){
  import('./glossary').then(({Glossary})=>ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Glossary/></React.StrictMode>));
}else if(!recoverFinalizedManifestation()){
  import('./topicMain').catch(()=>{if(!recoverFinalizedManifestation()){const root=document.getElementById('root');if(root)root.innerHTML='<main style="padding:2rem;font-family:sans-serif"><h1>Não foi possível carregar a consulta.</h1><p>Atualize a página e tente novamente.</p></main>'}});
  let checking=false;
  const receiptWatcher=window.setInterval(async()=>{
    if(localStorage.getItem(FINAL_RECEIPT_KEY)){
      window.clearInterval(receiptWatcher);
      recoverFinalizedManifestation();
      return;
    }
    const finalizing=Array.from(document.querySelectorAll('button')).some(button=>button.textContent?.includes('Finalizando'));
    if(finalizing&&!checking){
      checking=true;
      const recovered=await recoverReceiptFromBackend();
      checking=false;
      if(recovered)window.clearInterval(receiptWatcher);
    }
  },500);
}
