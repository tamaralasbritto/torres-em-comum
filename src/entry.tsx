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

window.addEventListener('hashchange',()=>window.location.reload());

let recovering=false;
const recoverFinalizedManifestation=()=>{
  if(recovering||!localStorage.getItem(FINAL_RECEIPT_KEY))return false;
  recovering=true;
  import('./finalRecovery').then(({renderFinalRecovery})=>renderFinalRecovery()).catch(()=>{recovering=false});
  return true;
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
  const receiptWatcher=window.setInterval(()=>{
    if(localStorage.getItem(FINAL_RECEIPT_KEY)){
      window.clearInterval(receiptWatcher);
      recoverFinalizedManifestation();
    }
  },300);
}
