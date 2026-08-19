import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import './admin.css';
import { AdminPanel } from './admin';
import { AdminHome } from './adminHome';
import { devices } from './data';

const hash=window.location.hash;
const params=new URLSearchParams(window.location.search);
const isAdminRoute=params.get('admin')==='1';
const isValidatorRoute=params.get('validator')==='1'||hash==='#admin'||((hash.includes('access_token=')||hash.includes('error_description='))&&!isAdminRoute);
const isGlossaryRoute=hash==='#glossario';
const isReceiptRoute=params.get('receipt')==='1';
const FINAL_RECEIPT_KEY='torres-em-comum:final-receipt';
const SESSION_KEY='torres-em-comum:remote-session';
const PARTICIPANT_KEY='torres-em-comum:participant';
const RESPONSE_KEY='torres-em-comum:responses';
const RECEIPT_URL='https://hzcpbbnjoeyyfwxdsbxt.supabase.co/functions/v1/participation-receipt';
const OFFICE_EMAIL='tercio@tercioguilhermeadv.com';

window.addEventListener('hashchange',()=>window.location.reload());

const readJson=(key:string)=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
const esc=(value:unknown)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]||char));
const choiceLabel:Record<string,string>={agree:'Concordo',change:'Quero alterar',exclude:'Quero excluir',observe:'Tenho uma observação',abstain:'Não quero me manifestar a respeito'};

const receiptShell=(body:string)=>`<style>
  :root{font-family:Arial,Helvetica,sans-serif;color:#171713;background:#f4f0df}*{box-sizing:border-box}body{margin:0;background:#f4f0df;color:#171713}.receipt-page{max-width:980px;margin:0 auto;padding:48px 24px 72px}.receipt-card{background:#fffdf4;border:1px solid #201f19;padding:36px}.receipt-eyebrow{font-size:12px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;margin:0 0 14px}.receipt-title{font-family:Georgia,'Times New Roman',serif;font-size:46px;line-height:1.04;margin:0 0 26px}.receipt-grid{display:grid;grid-template-columns:210px 1fr;gap:10px 20px;border-top:1px solid #b7b29f;border-bottom:1px solid #b7b29f;padding:20px 0;margin:24px 0}.receipt-grid strong{font-size:13px;text-transform:uppercase;letter-spacing:.08em}.receipt-grid code{overflow-wrap:anywhere}.receipt-list{display:grid;gap:14px;margin:26px 0}.receipt-item{border:1px solid #b7b29f;padding:18px;background:#fff}.receipt-item small{display:block;margin-bottom:7px}.receipt-item h3{margin:0 0 8px;font-size:18px}.receipt-item p{white-space:pre-wrap;margin:8px 0 0;line-height:1.5}.receipt-note{line-height:1.55}.receipt-warning{border:1px solid #8a6a00;background:#fff4c2;padding:14px 16px;margin:18px 0}.receipt-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}.receipt-actions button,.receipt-actions a{appearance:none;border:1px solid #171713;background:#f8d52f;color:#171713;padding:14px 18px;font-weight:700;text-decoration:none;cursor:pointer;font-size:15px}.receipt-actions .secondary{background:#fffdf4}.receipt-loading{min-height:55vh;display:grid;place-items:center;text-align:center}.receipt-loading h1{font-family:Georgia,'Times New Roman',serif;font-size:38px;margin:0 0 12px}@media(max-width:640px){.receipt-page{padding:24px 14px}.receipt-card{padding:22px}.receipt-title{font-size:34px}.receipt-grid{grid-template-columns:1fr;gap:5px}.receipt-grid strong{margin-top:10px}}@media print{body{background:#fff}.receipt-page{max-width:none;padding:0}.receipt-card{border:0;padding:0}.no-print{display:none!important}}
</style><main class="receipt-page">${body}</main>`;

const renderReceiptLoading=(message='Recuperando seu comprovante…')=>{
  const root=document.getElementById('root');
  if(root)root.innerHTML=receiptShell(`<section class="receipt-loading"><div><p class="receipt-eyebrow">TORRES EM COMUM</p><h1>${esc(message)}</h1><p>Não feche esta página.</p></div></section>`);
};

const renderReceiptError=(message:string)=>{
  const root=document.getElementById('root');
  if(!root)return;
  root.innerHTML=receiptShell(`<section class="receipt-card"><p class="receipt-eyebrow">COMPROVANTE</p><h1 class="receipt-title">Não foi possível abrir o comprovante.</h1><p class="receipt-note">${esc(message)}</p><div class="receipt-actions no-print"><button id="receipt-retry">Tentar novamente</button><a class="secondary" href="/">Voltar à consulta</a></div></section>`);
  document.getElementById('receipt-retry')?.addEventListener('click',()=>window.location.reload());
};

const emailContent=(participant:any,participantName:string)=>{
  const subject=participant?`Manifestação sobre o Regimento Interno — Torre ${participant.tower} / Apto. ${participant.apartment}`:'Manifestação sobre o Regimento Interno — Torres de Olinda';
  const body=`Prezados,\n\nSeguem, em anexo, minhas considerações a respeito da proposta de Regimento Interno do Condomínio Torres de Olinda.\n\nAtenciosamente,\n${participantName}${participant?`\nTorre ${participant.tower} — Apartamento ${participant.apartment}`:''}`;
  return {subject,body};
};

const openWebmailDialog=(participant:any,participantName:string)=>{
  document.getElementById('webmail-dialog')?.remove();
  const dialog=document.createElement('dialog');
  dialog.id='webmail-dialog';
  dialog.className='webmail-dialog';
  dialog.innerHTML=`
    <form method="dialog" class="webmail-card">
      <p class="webmail-eyebrow">ENVIAR MANIFESTAÇÃO</p>
      <h2>Onde você quer abrir o e-mail?</h2>
      <p class="webmail-copy">O destinatário, o assunto e o texto já vão preenchidos. Depois, é só anexar o PDF que você salvou.</p>
      <div class="webmail-options">
        <button type="button" data-webmail="gmail">Abrir no Gmail →</button>
        <button type="button" data-webmail="outlook">Abrir no Outlook / Hotmail →</button>
        <button type="button" class="secondary" data-webmail="copy">Copiar texto do e-mail</button>
      </div>
      <button class="webmail-close" value="cancel">Cancelar</button>
      <p class="webmail-status" aria-live="polite"></p>
    </form>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('click',async(event)=>{
    const target=event.target as Element|null;
    const button=target?.closest<HTMLButtonElement>('[data-webmail]');
    if(!button)return;
    const {subject,body}=emailContent(participant,participantName);
    if(button.dataset.webmail==='gmail'){
      const url=`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(OFFICE_EMAIL)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(url,'_blank','noopener,noreferrer');
      dialog.close();
      return;
    }
    if(button.dataset.webmail==='outlook'){
      const url=`https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(OFFICE_EMAIL)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(url,'_blank','noopener,noreferrer');
      dialog.close();
      return;
    }
    if(button.dataset.webmail==='copy'){
      const full=`Para: ${OFFICE_EMAIL}\nAssunto: ${subject}\n\n${body}`;
      const status=dialog.querySelector<HTMLElement>('.webmail-status');
      try{
        await navigator.clipboard.writeText(full);
        if(status)status.textContent='Texto copiado.';
      }catch{
        if(status)status.textContent='Não foi possível copiar automaticamente.';
      }
    }
  });
  if(typeof dialog.showModal==='function')dialog.showModal();
  else dialog.setAttribute('open','');
};

const renderReceiptStatic=()=>{
  const root=document.getElementById('root');
  if(!root)return false;
  const receipt=readJson(FINAL_RECEIPT_KEY);
  const participant=readJson(PARTICIPANT_KEY);
  const responses=readJson(RESPONSE_KEY)||{};
  if(!receipt)return false;

  const changed=Object.entries(responses as Record<string,any>).filter(([,response])=>['change','exclude','observe'].includes(response?.choice)).map(([id,response])=>({device:devices.find(device=>device.id===id),response}));
  const participantName=participant?.name||'Participante';
  const participantRole=participant?.role==='tenant'?'Inquilino(a)':'Proprietário(a)';
  const unit=participant?`Torre ${participant.tower} — Apto. ${participant.apartment}`:'Unidade não disponível neste navegador';
  const items=changed.length?`<div class="receipt-list">${changed.map(({device,response})=>`<article class="receipt-item"><small>${esc(device?.theme||'Regimento')} · Art. ${esc(device?.article||'—')}${device?.subdivision?`, ${esc(device.subdivision)}`:''}</small><h3>${esc(device?.title||device?.id||'Dispositivo')}</h3><strong>${esc(choiceLabel[response?.choice]||response?.choice||'Manifestação')}</strong><p>${esc(response?.comment?.trim()||'Sem texto adicional.')}</p></article>`).join('')}</div>`:'<p class="receipt-note">Nenhum pedido de alteração, exclusão ou observação foi registrado.</p>';
  const conflict=receipt.status==='conflicted'?'<div class="receipt-warning"><strong>Aguardando validação da unidade.</strong><br>Há outra manifestação associada a esta unidade. Os registros foram preservados e ficam fora da contagem pública até a validação.</div>':'';
  const finalizedAt=receipt.finalizedAt?new Date(receipt.finalizedAt).toLocaleString('pt-BR'):'—';

  root.innerHTML=receiptShell(`<section class="receipt-card"><p class="receipt-eyebrow">MANIFESTAÇÃO FINALIZADA</p><h1 class="receipt-title">Seu comprovante está pronto.</h1>${conflict}<div class="receipt-grid"><strong>Responsável informado</strong><span>${esc(participantName)}</span><strong>Vínculo declarado</strong><span>${esc(participantRole)}</span><strong>Unidade</strong><span>${esc(unit)}</span><strong>Protocolo</strong><code>${esc(receipt.protocolId)}</code><strong>Data e hora do registro</strong><span>${esc(finalizedAt)}</span><strong>Hash de integridade</strong><code>${esc(receipt.payloadHash)}</code></div>${items}<p class="receipt-note">Para os demais termos da minuta, não houve manifestações específicas.</p><div class="receipt-actions no-print"><button id="receipt-print">Gerar / salvar manifestação em PDF</button><button id="receipt-email">Abrir e-mail no navegador →</button></div><p class="receipt-note no-print">Depois de salvar o PDF, anexe-o ao e-mail antes de enviar.</p></section>`);

  document.getElementById('receipt-print')?.addEventListener('click',()=>window.print());
  document.getElementById('receipt-email')?.addEventListener('click',()=>openWebmailDialog(participant,participantName));
  return true;
};

const goToReceipt=()=>{
  if(isReceiptRoute)return;
  window.location.replace('/?receipt=1');
};

const fetchReceiptIntoLocal=async()=>{
  const session=readJson(SESSION_KEY);
  if(!session?.participantId||!session?.resumeToken)return false;
  try{
    const response=await fetch(RECEIPT_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({participantId:session.participantId,resumeToken:session.resumeToken})});
    if(!response.ok)return false;
    const receipt=await response.json();
    if(!receipt?.ready)return false;
    localStorage.setItem(FINAL_RECEIPT_KEY,JSON.stringify({protocolId:receipt.protocolId,status:receipt.status,finalizedAt:receipt.finalizedAt,payloadHash:receipt.payloadHash,countsInPanel:receipt.countsInPanel===true,conflict:receipt.conflict||null}));
    localStorage.setItem(SESSION_KEY,JSON.stringify({...session,status:receipt.status}));
    if(receipt.participant)localStorage.setItem(PARTICIPANT_KEY,JSON.stringify(receipt.participant));
    return true;
  }catch{return false}
};

const recoverReceiptWithRetry=async()=>{
  if(localStorage.getItem(FINAL_RECEIPT_KEY))return true;
  for(let attempt=0;attempt<8;attempt+=1){
    if(await fetchReceiptIntoLocal())return true;
    await new Promise(resolve=>window.setTimeout(resolve,500));
  }
  return false;
};

if(isReceiptRoute){
  renderReceiptLoading();
  void (async()=>{
    if(!readJson(PARTICIPANT_KEY)&&readJson(SESSION_KEY))await fetchReceiptIntoLocal();
    const ready=await recoverReceiptWithRetry();
    if(!ready){renderReceiptError('Não encontrei um comprovante finalizado para esta sessão. Se você acabou de finalizar, aguarde alguns segundos e tente novamente.');return}
    if(!renderReceiptStatic())renderReceiptError('O registro foi localizado, mas os dados do comprovante não puderam ser lidos neste navegador.');
  })();
}else if(isAdminRoute){
  ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AdminHome/></React.StrictMode>);
}else if(isValidatorRoute){
  ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AdminPanel/></React.StrictMode>);
}else if(isGlossaryRoute){
  import('./glossary').then(({Glossary})=>ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Glossary/></React.StrictMode>));
}else{
  import('./topicMain').catch(()=>{
    const root=document.getElementById('root');
    if(root)root.innerHTML='<main style="padding:2rem;font-family:sans-serif"><h1>Não foi possível carregar a consulta.</h1><p>Atualize a página e tente novamente.</p></main>';
  });

  let checking=false;
  const receiptWatcher=window.setInterval(async()=>{
    if(localStorage.getItem(FINAL_RECEIPT_KEY)){
      window.clearInterval(receiptWatcher);
      goToReceipt();
      return;
    }
    const finalizing=Array.from(document.querySelectorAll('button')).some(button=>button.textContent?.includes('Finalizando'));
    if(finalizing&&!checking){
      checking=true;
      const recovered=await fetchReceiptIntoLocal();
      checking=false;
      if(recovered){
        window.clearInterval(receiptWatcher);
        goToReceipt();
      }
    }
  },500);
}
