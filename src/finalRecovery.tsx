import React from 'react';
import ReactDOM from 'react-dom/client';
import { decisionTopics, topicDevices } from './data/topics';
import type { Participant, Responses, FinalReceipt } from './lib/data';
import type { ManifestationChoice } from './data';
import './topic.css';

const OFFICE_EMAIL='tercio@tercioguilhermeadv.com';
const PARTICIPANT_KEY='torres-em-comum:participant';
const RESPONSE_KEY='torres-em-comum:responses';
const RECEIPT_KEY='torres-em-comum:final-receipt';

const labels:Record<ManifestationChoice,string>={agree:'Concordo',change:'Quero alterar',exclude:'Quero excluir',observe:'Tenho uma observação'};
const typeLabel=(role:Participant['role'])=>role==='owner'?'Proprietário(a)':'Inquilino(a)';

function readJson<T>(key:string):T|null{try{return JSON.parse(localStorage.getItem(key)||'null') as T|null}catch{return null}}

function Recovery(){
 const participant=readJson<Participant>(PARTICIPANT_KEY);
 const responses=readJson<Responses>(RESPONSE_KEY)??{};
 const receipt=readJson<FinalReceipt>(RECEIPT_KEY);
 const changedItems=decisionTopics.flatMap(topic=>topicDevices(topic).filter(device=>{
   const response=responses[device.id];
   return response&&['change','exclude','observe'].includes(response.choice);
 }).map(device=>({topic,device,response:responses[device.id]})));

 if(!participant||!receipt){return <main className="appShell"><section className="review tabpanel"><h1>Não foi possível recuperar o comprovante.</h1><p>Reabra a página inicial. Se a manifestação já tiver sido finalizada, não envie novamente sem conferir o protocolo.</p></section></main>}

 const emailBody=`Prezados,\n\nSeguem, em anexo, minhas considerações a respeito da proposta de Regimento Interno do Condomínio Torres de Olinda.\n\nAtenciosamente,\n${participant.name}\nTorre ${participant.tower} — Apartamento ${participant.apartment}`;
 const openEmail=()=>{window.location.href=`mailto:${OFFICE_EMAIL}?subject=${encodeURIComponent(`Manifestação sobre o Regimento Interno — Torre ${participant.tower} / Apto. ${participant.apartment}`)}&body=${encodeURIComponent(emailBody)}`};

 return <main className="appShell">
  <section className="review printable tabpanel">
   <div className="sectionhead"><div><p className="eyebrow">MANIFESTAÇÃO FINALIZADA</p><h1>Seu comprovante está pronto.</h1></div><span>Registro concluído</span></div>
   <div className="receipt">
    <strong>Responsável informado</strong><span>{participant.name}</span>
    <strong>Vínculo declarado</strong><span>{typeLabel(participant.role)}</span>
    <strong>Unidade</strong><span>Torre {participant.tower} — Apto. {participant.apartment}</span>
    <strong>Protocolo</strong><code>{receipt.protocolId}</code>
    <strong>Data e hora do registro</strong><span>{new Date(receipt.finalizedAt).toLocaleString('pt-BR')}</span>
    <strong>Hash de integridade</strong><code>{receipt.payloadHash}</code>
   </div>
   {changedItems.length===0?<p className="empty">Nenhum pedido de alteração, exclusão ou observação foi registrado.</p>:<div className="reviewlist">{changedItems.map(({topic,device,response})=><article key={device.id}><span>{topic.category} · Art. {device.article}{device.subdivision?`, ${device.subdivision}`:''}</span><h3>{topic.title}</h3><strong>{labels[response.choice]}</strong><p>{response.comment?.trim()||'Sem texto adicional.'}</p></article>)}</div>}
   <p>Quanto aos demais dispositivos da minuta, não foram registradas manifestações específicas pelo participante.</p>
   <div className="finalactions no-print"><button onClick={()=>window.print()}>Gerar / salvar manifestação em PDF</button><button className="send" onClick={openEmail}>Abrir e-mail para envio →</button></div>
   <p className="no-print">Depois de salvar o PDF, anexe-o ao e-mail antes de enviar.</p>
  </section>
 </main>
}

export function renderFinalRecovery(){const root=document.getElementById('root');if(!root)return;root.innerHTML='';ReactDOM.createRoot(root).render(<React.StrictMode><Recovery/></React.StrictMode>)}
