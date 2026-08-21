import { getTurnstileToken } from './lib/turnstile';

const RECOVERY_API='https://hzcpbbnjoeyyfwxdsbxt.supabase.co/functions/v1/participation-recovery';
const SESSION_KEY='torres-em-comum:remote-session';
const PARTICIPANT_KEY='torres-em-comum:participant';
const RESPONSE_KEY='torres-em-comum:responses';
const RECEIPT_KEY='torres-em-comum:final-receipt';

type Session={participantId:string;protocolId:string;resumeToken:string;status:string;lastSavedAt?:string};

async function recoveryApi(payload:Record<string,unknown>){
  const response=await fetch(RECOVERY_API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  let data:any={};
  try{data=await response.json()}catch{}
  if(!response.ok)throw new Error(data.error||`http_${response.status}`);
  return data;
}

function loadSession():Session|null{
  try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}
}

function makeModal(code:string,session:Session){
  if(document.getElementById('recoveryCodeModal'))return;
  const overlay=document.createElement('div');
  overlay.id='recoveryCodeModal';
  overlay.style.cssText='position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;padding:20px;background:rgba(20,20,16,.62)';
  const card=document.createElement('div');
  card.style.cssText='width:min(520px,100%);background:#fffdf4;border:1px solid #171713;padding:24px;box-shadow:0 18px 60px rgba(0,0,0,.28);font-family:Arial,Helvetica,sans-serif;color:#171713';
  const title=document.createElement('h2');
  title.textContent='Guarde seu código de recuperação';
  title.style.cssText='margin:0 0 10px;font-size:22px';
  const text=document.createElement('p');
  text.textContent='Se você trocar de celular, navegador ou computador, este código permite recuperar suas respostas. Não compartilhe com outras pessoas.';
  text.style.cssText='margin:0 0 16px;line-height:1.5';
  const codeBox=document.createElement('code');
  codeBox.textContent=code;
  codeBox.style.cssText='display:block;padding:14px;border:1px dashed #171713;background:#f4efe3;font-size:18px;font-weight:700;letter-spacing:.04em;word-break:break-all;margin-bottom:14px';
  const copy=document.createElement('button');
  copy.textContent='Copiar código';
  copy.style.cssText='padding:11px 16px;margin-right:8px;border:1px solid #171713;background:#fffdf4;font-weight:700;cursor:pointer';
  copy.onclick=async()=>{try{await navigator.clipboard.writeText(code);copy.textContent='Copiado ✓'}catch{window.prompt('Copie seu código:',code)}};
  const confirm=document.createElement('button');
  confirm.textContent='Já guardei meu código';
  confirm.style.cssText='padding:11px 16px;border:1px solid #171713;background:#f3c54b;font-weight:700;cursor:pointer';
  confirm.onclick=async()=>{
    confirm.disabled=true;
    try{
      await recoveryApi({action:'acknowledge',participantId:session.participantId,resumeToken:session.resumeToken});
      localStorage.setItem(`torres-em-comum:recovery-ack:${session.participantId}`,'1');
      overlay.remove();
    }catch{
      confirm.disabled=false;
      alert('Não consegui confirmar agora. O código continuará aparecendo para você até conseguirmos registrar que foi guardado.');
    }
  };
  card.append(title,text,codeBox,copy,confirm);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

let issuing=false;
async function maybeIssueRecoveryCode(){
  if(issuing)return;
  const session=loadSession();
  if(!session)return;
  if(localStorage.getItem(`torres-em-comum:recovery-ack:${session.participantId}`)==='1')return;
  issuing=true;
  try{
    const result=await recoveryApi({action:'issue',participantId:session.participantId,resumeToken:session.resumeToken});
    if(result.recoveryCode)makeModal(result.recoveryCode,session);
    else if(result.alreadyClaimed)localStorage.setItem(`torres-em-comum:recovery-ack:${session.participantId}`,'1');
  }catch{}
  finally{issuing=false}
}

async function recoverParticipation(){
  const tower=(window.prompt('Qual é a sua torre? Digite A, B, C ou D:')||'').trim().toUpperCase();
  if(!['A','B','C','D'].includes(tower))return alert('Torre inválida.');
  const apartment=(window.prompt('Qual é o apartamento? Use três números, por exemplo 206:')||'').trim();
  if(!/^\d{3}$/.test(apartment))return alert('Apartamento inválido.');
  const recoveryCode=(window.prompt('Digite seu código de recuperação:')||'').trim().toUpperCase();
  if(!recoveryCode)return;
  try{
    const turnstileToken=await getTurnstileToken();
    const result=await recoveryApi({action:'recover',tower,apartment,recoveryCode,turnstileToken});
    const responses=Object.fromEntries((result.responses||[]).map((r:any)=>[r.device_id,{choice:r.choice,comment:r.comment||undefined}]));
    localStorage.setItem(SESSION_KEY,JSON.stringify(result.session));
    localStorage.setItem(PARTICIPANT_KEY,JSON.stringify(result.participant));
    localStorage.setItem(RESPONSE_KEY,JSON.stringify(responses));
    if(result.receipt)localStorage.setItem(RECEIPT_KEY,JSON.stringify(result.receipt));
    else localStorage.removeItem(RECEIPT_KEY);
    if(result.session?.status==='draft')alert('Participação recuperada. Suas respostas serão carregadas agora.');
    else alert('Manifestação finalizada recuperada. Suas respostas e comprovante serão carregados agora.');
    window.location.reload();
  }catch(e){
    const code=String((e as Error)?.message||'');
    if(code.includes('rate_limited'))alert('Muitas tentativas de recuperação. Aguarde um pouco antes de tentar novamente.');
    else if(code.includes('invalid_recovery_credentials'))alert('Torre, apartamento ou código de recuperação não conferem.');
    else alert('Não foi possível recuperar a participação agora. Tente novamente em instantes.');
  }
}

function ensureRecoveryButton(){
  const section=document.querySelector<HTMLElement>('.identification');
  if(!section||document.getElementById('recoveryAccessButton')||loadSession())return;
  const start=section.querySelector<HTMLButtonElement>('.identitystart');
  if(!start)return;
  const button=document.createElement('button');
  button.id='recoveryAccessButton';
  button.type='button';
  button.textContent='Já comecei em outro dispositivo';
  button.style.cssText='display:block;margin-top:12px;padding:11px 16px;border:1px solid #171713;background:transparent;font-weight:700;cursor:pointer';
  button.addEventListener('click',recoverParticipation);
  start.insertAdjacentElement('afterend',button);
}

const observer=new MutationObserver(()=>{ensureRecoveryButton();void maybeIssueRecoveryCode()});
observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('load',()=>{ensureRecoveryButton();void maybeIssueRecoveryCode()});
window.setInterval(()=>{ensureRecoveryButton();void maybeIssueRecoveryCode()},2000);
