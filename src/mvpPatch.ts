const PARTICIPANT_KEY='torres-em-comum:participant';
const RECEIPT_KEY='torres-em-comum:final-receipt';

type Participant={name:string;tower:string;apartment:string;role:'owner'|'tenant'};
type Receipt={protocolId:string;finalizedAt:string;payloadHash:string;status:string};

function readJson<T>(key:string):T|null{
  try{return JSON.parse(localStorage.getItem(key)||'null') as T|null}catch{return null}
}

function participantLabel(p:Participant){return p.role==='owner'?'Proprietário(a)':'Inquilino(a)'}

function addPrintStyles(){
  if(document.getElementById('mvp-print-styles'))return;
  const style=document.createElement('style');
  style.id='mvp-print-styles';
  style.textContent=`
    .mvp-final-document{display:none}
    .mvp-results-placeholder{max-width:780px;margin:48px auto;padding:32px;border:1px solid rgba(31,31,31,.14);border-radius:18px;background:#fff}
    .mvp-results-placeholder h2{margin-top:0}
    @media print{
      .mvp-final-document{display:block!important;margin:0 0 28px;padding:0 0 20px;border-bottom:1px solid #bbb}
      .mvp-final-document h1{font-size:22px;margin:0 0 18px}
      .mvp-final-document p{margin:5px 0}
      .mvp-final-closing{display:block!important;margin-top:26px;font-weight:600}
      .no-print,.appTop,.tabs,.topicpager,.workspaceSidebar{display:none!important}
      body{background:#fff!important}
      .tabpanel,.review,.printable{box-shadow:none!important;border:0!important;margin:0!important;padding:0!important;max-width:none!important}
    }
  `;
  document.head.appendChild(style);
}

function ensureFinalDocument(){
  const review=document.querySelector<HTMLElement>('section.review.printable');
  if(!review)return;
  const receipt=readJson<Receipt>(RECEIPT_KEY);
  if(!receipt)return;
  const participant=readJson<Participant>(PARTICIPANT_KEY);
  if(!participant)return;

  let doc=review.querySelector<HTMLElement>('.mvp-final-document');
  if(!doc){
    doc=document.createElement('div');
    doc.className='mvp-final-document';
    review.prepend(doc);
  }
  doc.innerHTML=`
    <h1>Manifestação sobre a proposta de Regimento Interno — Torres de Olinda</h1>
    <p><strong>Responsável informado:</strong> ${escapeHtml(participant.name)}</p>
    <p><strong>Vínculo declarado:</strong> ${participantLabel(participant)}</p>
    <p><strong>Unidade:</strong> Torre ${escapeHtml(participant.tower)} — Apartamento ${escapeHtml(participant.apartment)}</p>
    <p><strong>Protocolo:</strong> ${escapeHtml(receipt.protocolId)}</p>
    <p><strong>Data de registro:</strong> ${new Date(receipt.finalizedAt).toLocaleString('pt-BR')}</p>
    <p><strong>Hash de integridade:</strong> ${escapeHtml(receipt.payloadHash)}</p>
  `;

  let closing=review.querySelector<HTMLElement>('.mvp-final-closing');
  if(!closing){
    closing=document.createElement('p');
    closing.className='mvp-final-closing';
    review.appendChild(closing);
  }
  closing.textContent='Quanto aos demais dispositivos da minuta, não foram registradas manifestações específicas pelo participante.';

  const printButton=[...review.querySelectorAll('button')].find(b=>/Imprimir|salvar PDF/i.test(b.textContent||''));
  if(printButton)printButton.textContent='Gerar / salvar manifestação em PDF';
  const emailButton=[...review.querySelectorAll('button')].find(b=>/Abrir e-mail|Enviar ao escritório/i.test(b.textContent||''));
  if(emailButton)emailButton.textContent='Abrir e-mail no navegador →';
}

function disablePublicResults(){
  const buttons=[...document.querySelectorAll<HTMLButtonElement>('button')];
  const activeResults=buttons.some(b=>b.textContent?.trim()==='Resultados'&&b.classList.contains('active'));
  if(!activeResults)return;
  const sections=[...document.querySelectorAll<HTMLElement>('section.tabpanel')];
  const section=sections.find(s=>/Resultados/i.test(s.textContent||''));
  if(!section||section.dataset.mvpResultsDisabled==='1')return;
  section.dataset.mvpResultsDisabled='1';
  section.innerHTML=`<div class="mvp-results-placeholder"><p class="eyebrow">RESULTADOS</p><h2>Ainda não temos dados suficientes.</h2><p>Os resultados públicos serão disponibilizados quando houver volume mínimo de respostas para exibição com segurança e privacidade.</p></div>`;
}

function escapeHtml(value:string){return value.replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]||c))}

addPrintStyles();
const observer=new MutationObserver(()=>{ensureFinalDocument();disablePublicResults()});
observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
ensureFinalDocument();
disablePublicResults();
