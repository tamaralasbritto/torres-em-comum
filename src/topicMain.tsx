import React from 'react';
import ReactDOM from 'react-dom/client';
import './topic.css';
import { type ManifestationChoice } from './data';
import { decisionTopics, topicDevices } from './data/topics';
import {
  backendStatus, createRemoteDraft, finalizeRemoteDraft, loadFinalReceipt, loadParticipant,
  loadPublicPanel, loadRemoteSession, loadResponses, resumeRemoteDraft, saveParticipant,
  saveResponses, saveRemoteDraft, type FinalReceipt, type Participant, type PublicPanel,
  type RemoteSession, type Responses
} from './lib/data';

const OFFICE_EMAIL='tercio@tercioguilhermeadv.com';
const choices:{id:ManifestationChoice;label:string}[]=[
 {id:'agree',label:'Concordo'},
 {id:'change',label:'Quero alterar'},
 {id:'exclude',label:'Quero excluir'},
 {id:'observe',label:'Tenho uma observação'},
];
const categoryMarks:Record<string,string>={
 'Regras gerais':'§','Administração':'⚙','Áreas comuns':'⌂','Acesso e circulação':'⇄',
 'Garagem e mobilidade':'P','Lazer':'◯','Pets':'♢','Dentro do apartamento':'▣',
 'Mudanças e obras':'⚒','Resíduos e sustentabilidade':'♻','Tecnologia e privacidade':'◎','Penalidades':'!'
};
const apartments=Array.from({length:10},(_,floor)=>Array.from({length:10},(_,unit)=>`${floor}${String(unit+1).padStart(2,'0')}`)).flat();
const typeLabel=(role:Participant['role'])=>role==='owner'?'Proprietário(a)':'Inquilino(a)';
const labelFor=(choice?:ManifestationChoice)=>choices.find(c=>c.id===choice)?.label??'';
type SaveState='local'|'loading'|'ready'|'saving'|'saved'|'error'|'finalizing'|'finalized'|'conflicted';
type Tab='inicio'|'unidade'|'participar'|'resumo'|'resultados';

function App(){
 const [tab,setTab]=React.useState<Tab>('inicio');
 const [index,setIndex]=React.useState(0);
 const [participant,setParticipant]=React.useState<Participant>(()=>loadParticipant()??{tower:'A',apartment:'001',name:'',role:'owner'});
 const [responses,setResponses]=React.useState<Responses>(()=>loadResponses());
 const [remoteSession,setRemoteSession]=React.useState<RemoteSession|null>(()=>loadRemoteSession());
 const [finalReceipt,setFinalReceipt]=React.useState<FinalReceipt|null>(()=>loadFinalReceipt());
 const [saveState,setSaveState]=React.useState<SaveState>(()=>finalReceipt?.status==='conflicted'?'conflicted':finalReceipt?'finalized':remoteSession?'loading':'local');
 const [lastSavedAt,setLastSavedAt]=React.useState<string|undefined>(()=>remoteSession?.lastSavedAt);
 const [hydrated,setHydrated]=React.useState(()=>!remoteSession||remoteSession.status!=='draft');
 const [panel,setPanel]=React.useState<PublicPanel|null>(null);
 const current=decisionTopics[index];
 const currentDevices=topicDevices(current);
 const categories=[...new Set(decisionTopics.map(t=>t.category))];
 const respondedDeviceIds=new Set(Object.keys(responses).filter(id=>responses[id]?.choice));
 const changedItems=decisionTopics.flatMap(t=>topicDevices(t).filter(d=>{const r=responses[d.id];return r&&['change','exclude','observe'].includes(r.choice)}).map(d=>({topic:t,device:d,response:responses[d.id]})));
 const identificationReady=participant.name.trim().length>2;
 const canEdit=remoteSession?.status==='draft'&&!finalReceipt&&saveState!=='finalizing';

 React.useEffect(()=>saveResponses(responses),[responses]);
 React.useEffect(()=>saveParticipant(participant),[participant]);
 React.useEffect(()=>{loadPublicPanel().then(setPanel).catch(()=>{})},[]);
 React.useEffect(()=>{
   if(!remoteSession||remoteSession.status!=='draft'){setHydrated(true);return}
   let active=true;setSaveState('loading');
   resumeRemoteDraft(remoteSession).then(remote=>{if(!active)return;setParticipant(remote.participant);setResponses(local=>Object.keys(local).length?local:remote.responses);setLastSavedAt(remote.lastSavedAt);setSaveState('ready');setHydrated(true)}).catch(()=>{if(active){setSaveState('error');setHydrated(true)}});
   return()=>{active=false};
 },[]);
 React.useEffect(()=>{
   if(!remoteSession||remoteSession.status!=='draft'||!hydrated||finalReceipt)return;
   const timer=window.setTimeout(async()=>{setSaveState('saving');try{const saved=await saveRemoteDraft(remoteSession,responses);setLastSavedAt(saved);setRemoteSession({...remoteSession,lastSavedAt:saved});setSaveState('saved')}catch{setSaveState('error')}},1200);
   return()=>window.clearTimeout(timer);
 },[responses,remoteSession?.participantId,hydrated,finalReceipt]);

 const openTab=(next:Tab)=>{setTab(next);window.scrollTo({top:0,behavior:'smooth'})};
 const go=(n:number)=>{setIndex(Math.max(0,Math.min(decisionTopics.length-1,n)));setTab('participar');window.scrollTo({top:0,behavior:'smooth'})};
 const selectCategory=(cat:string)=>{const i=decisionTopics.findIndex(t=>t.category===cat);if(i>=0)go(i)};
 const start=async()=>{if(!identificationReady)return;setSaveState('loading');try{const session=await createRemoteDraft(participant);setRemoteSession(session);setHydrated(true);setLastSavedAt(session.lastSavedAt);setSaveState('ready');if(Object.keys(responses).length)await saveRemoteDraft(session,responses);openTab('participar')}catch{setSaveState('error')}};
 const setDeviceResponse=(id:string,choice:ManifestationChoice)=>{if(!canEdit)return;setResponses(old=>({...old,[id]:{choice,comment:old[id]?.comment}}))};
 const setDeviceComment=(id:string,comment:string)=>{const r=responses[id];if(!canEdit||!r)return;setResponses(old=>({...old,[id]:{...r,comment}}))};
 const finalize=async()=>{if(!remoteSession||!respondedDeviceIds.size)return;if(!confirm(`Finalizar sua manifestação com ${respondedDeviceIds.size} artigo(s)/dispositivo(s) respondido(s)? O restante será considerado sem manifestação.`))return;setSaveState('finalizing');try{const receipt=await finalizeRemoteDraft(remoteSession,responses);setFinalReceipt(receipt);setRemoteSession({...remoteSession,status:receipt.status});setSaveState(receipt.status==='conflicted'?'conflicted':'finalized');setPanel(await loadPublicPanel())}catch{setSaveState('error')}};
 const manifestationText=()=>{const proof=finalReceipt?`Protocolo: ${finalReceipt.protocolId}\nHash SHA-256: ${finalReceipt.payloadHash}\nRegistrado em: ${new Date(finalReceipt.finalizedAt).toLocaleString('pt-BR')}\n\n`:'';const body=changedItems.map(({topic,device,response})=>`${topic.category} — ${topic.title}\nArt. ${device.article}${device.subdivision?`, ${device.subdivision}`:''}\nPosição: ${labelFor(response?.choice)}\nManifestação: ${response?.comment?.trim()||'(sem texto adicional)'}\n`).join('\n');return `MANIFESTAÇÃO SOBRE A MINUTA DO REGIMENTO INTERNO — TORRES DE OLINDA\n\nResponsável informado: ${participant.name}\nQualificação declarada: ${typeLabel(participant.role)}\nUnidade: Torre ${participant.tower} — Apto. ${participant.apartment}\n${proof}${body||'Nenhum pedido de alteração, exclusão ou observação foi registrado.'}`};
 const openEmail=()=>{if(!finalReceipt)return;window.location.href=`mailto:${OFFICE_EMAIL}?subject=${encodeURIComponent(`Manifestação Regimento — Torre ${participant.tower} Apto ${participant.apartment}`)}&body=${encodeURIComponent(manifestationText())}`};
 const saveLabel=finalReceipt?.status==='conflicted'?'Finalizado · aguardando validação':finalReceipt?'Manifestação finalizada':saveState==='saving'?'Salvando…':saveState==='saved'||saveState==='ready'?'Rascunho salvo':saveState==='error'?'Cópia local preservada · falha no remoto':saveState==='loading'?'Conectando…':'Ainda não iniciado';
 const panelFor=(topic:typeof current)=>panel?.devices.find(p=>p.deviceId===topic.deviceIds[0]);

 return <main className="appShell">
  <header className="top appTop"><button className="brand brandButton" onClick={()=>openTab('inicio')}>TORRES <span>EM COMUM</span></button><nav className="tabs">
   <button className={tab==='inicio'?'active':''} onClick={()=>openTab('inicio')}>Início</button>
   <button className={tab==='unidade'?'active':''} onClick={()=>openTab('unidade')}>Minha unidade</button>
   <button className={tab==='participar'?'active':''} onClick={()=>openTab('participar')}>Participar</button>
   <button onClick={()=>{window.location.hash='glossario'}}>Glossário</button>
   <button className={tab==='resumo'?'active':''} onClick={()=>openTab('resumo')}>Meu resumo</button>
   <button className={tab==='resultados'?'active':''} onClick={()=>openTab('resultados')}>Resultados</button>
  </nav></header>

  {tab==='inicio'&&<section className="hero compacthero tabpanel"><div><p className="eyebrow">CONSTRUÇÃO PARTICIPATIVA DO REGIMENTO INTERNO</p><h1>Opine sobre as regras que vão organizar <em>nossa convivência.</em></h1><p className="lead">Você não precisa percorrer o regimento inteiro. Escolha os temas que importam para você, abra os assuntos e manifeste-se artigo por artigo.</p><button className="primary" onClick={()=>openTab(remoteSession?'participar':'unidade')}>Começar →</button></div><div className="mosaic" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div></section>}

  {tab==='unidade'&&<section className="identification tabpanel"><div className="sectionhead"><div><p className="eyebrow">SUA UNIDADE</p><h2>Quem está se manifestando?</h2></div><span>Dados privados</span></div><div className="identityform"><label>Nome do responsável<input disabled={!!remoteSession} value={participant.name} onChange={e=>setParticipant({...participant,name:e.target.value})}/></label><label>Torre<select disabled={!!remoteSession} value={participant.tower} onChange={e=>setParticipant({...participant,tower:e.target.value as Participant['tower']})}>{['A','B','C','D'].map(t=><option key={t}>{t}</option>)}</select></label><label>Apartamento<select disabled={!!remoteSession} value={participant.apartment} onChange={e=>setParticipant({...participant,apartment:e.target.value})}>{apartments.map(a=><option key={a}>{a}</option>)}</select></label><fieldset disabled={!!remoteSession}><legend>Vínculo</legend><label><input type="radio" checked={participant.role==='owner'} onChange={()=>setParticipant({...participant,role:'owner'})}/> Proprietário(a)</label><label><input type="radio" checked={participant.role==='tenant'} onChange={()=>setParticipant({...participant,role:'tenant'})}/> Inquilino(a)</label></fieldset></div><p className="privacyhint">Nome e unidade não aparecem nos resultados públicos. Se houver duas manifestações para o mesmo apartamento, ambas ficam fora da contagem até validação.</p>{!remoteSession&&<button className="primary identitystart" disabled={!identificationReady||saveState==='loading'} onClick={start}>Salvar e começar →</button>}{remoteSession&&<button className="primary identitystart" onClick={()=>openTab('participar')}>Continuar consulta →</button>}<div className="savestatus"><strong>{saveLabel}</strong>{lastSavedAt&&!finalReceipt&&<span>Último salvamento: {new Date(lastSavedAt).toLocaleString('pt-BR')}</span>}{remoteSession&&<span>Protocolo: {remoteSession.protocolId}</span>}</div></section>}

  {tab==='participar'&&<section className="consult tabpanel workspace"><aside className="workspaceSidebar"><div className="sideTitle"><p className="eyebrow">TEMAS</p><strong>{changedItems.length} manifestação(ões)</strong></div>{categories.map(cat=>{const topics=decisionTopics.map((t,i)=>({t,i})).filter(x=>x.t.category===cat);const active=cat===current.category;return <details key={cat} open={active} className={`sideCategory ${active?'active':''}`}><summary onClick={()=>selectCategory(cat)}><span className="catmark">{categoryMarks[cat]||'•'}</span><span><strong>{cat}</strong><small>{topics.length} assuntos</small></span></summary><div className="sideTopics">{topics.map(({t,i})=><button key={t.id} className={i===index?'active':''} onClick={()=>go(i)}>{t.title}</button>)}</div></details>})}</aside>
   <div className="workspaceContent"><div className="sectionhead compact"><div><p className="eyebrow">{current.category}</p><h2>{current.title}</h2></div><button className="skipTopic" onClick={()=>go(index+1)} disabled={index===decisionTopics.length-1}>Pular assunto →</button></div>{!canEdit&&!finalReceipt&&<div className="gate"><strong>Salve sua identificação em “Minha unidade” para responder.</strong></div>}<div className="minutastack">{currentDevices.map(d=>{const r=responses[d.id];return <article className="minutaitem" key={d.id}><div className="minutaheading"><span>Texto da minuta</span><strong>Art. {d.article}{d.subdivision?`, ${d.subdivision}`:''}</strong></div><p className="legal">{d.text}</p>{d.plainLanguage&&<details className="meaningdetails"><summary>O que isso quer dizer?</summary><p>{d.plainLanguage}</p><small>Explicação apenas para facilitar a leitura. O texto da minuta acima é a referência.</small></details>}{d.translationNote&&<details className="wordingdetails"><summary>⚠ Ponto de atenção na redação</summary><p>{d.translationNote}</p></details>}<div className="articledecision"><strong>Sua posição sobre este artigo</strong><div className="options articleoptions">{choices.map(c=><button disabled={!canEdit} key={c.id} className={r?.choice===c.id?'selected':''} onClick={()=>setDeviceResponse(d.id,c.id)}>{c.label}</button>)}</div>{r&&['change','exclude','observe'].includes(r.choice)&&<label className="comment">Explique seu ponto<textarea disabled={!canEdit} value={r.comment||''} onChange={e=>setDeviceComment(d.id,e.target.value)} placeholder="Escreva em linguagem simples."/><small>Evite dados pessoais seus ou de terceiros.</small></label>}</div></article>})}</div><div className="topicpager"><button disabled={index===0} onClick={()=>go(index-1)}>← Assunto anterior</button><button disabled={index===decisionTopics.length-1} onClick={()=>go(index+1)}>Próximo assunto →</button></div></div>
  </section>}

  {tab==='resumo'&&<section className="review printable tabpanel"><div className="sectionhead"><div><p className="eyebrow">SEU RESUMO</p><h2>{respondedDeviceIds.size} artigo(s) respondido(s)</h2></div><span>{changedItems.length} ponto(s) para revisão</span></div>{changedItems.length===0?<p className="empty">Você ainda não registrou pedido de alteração, exclusão ou observação.</p>:<div className="reviewlist">{changedItems.map(({topic,device,response})=><article key={device.id}><span>{topic.category} · Art. {device.article}{device.subdivision?`, ${device.subdivision}`:''}</span><h3>{topic.title}</h3><strong>{labelFor(response?.choice)}</strong><p>{response?.comment||'Sem texto adicional.'}</p><button className="no-print" onClick={()=>go(decisionTopics.indexOf(topic))}>Editar</button></article>)}</div>}{!finalReceipt&&remoteSession&&<div className="finalactions no-print"><button className="send" disabled={!respondedDeviceIds.size||saveState==='finalizing'} onClick={finalize}>{saveState==='finalizing'?'Finalizando…':'Finalizar manifestação →'}</button></div>}{finalReceipt&&<><div className="receipt"><strong>Protocolo</strong><code>{finalReceipt.protocolId}</code><strong>Hash de integridade</strong><code>{finalReceipt.payloadHash}</code>{finalReceipt.status==='conflicted'&&<p>Esta unidade está aguardando validação de legitimidade e ainda não entra nos resultados.</p>}</div><div className="finalactions no-print"><button onClick={()=>window.print()}>Salvar PDF</button><button className="send" onClick={openEmail}>Abrir e-mail oficial →</button></div></>}</section>}

  {tab==='resultados'&&<section className="dashboard tabpanel"><div className="sectionhead"><div><p className="eyebrow">RESULTADOS PÚBLICOS</p><h2>O que o condomínio está dizendo.</h2></div><span>{backendStatus.label}</span></div><p className="dashboardintro">Só aparecem resultados com pelo menos 5 respostas. Dados pessoais e unidades não são exibidos.</p><div className="dashboardgrid">{decisionTopics.map(t=>{const p=panelFor(t);if(!p)return null;return <article className="dashcard" key={t.id}><div className="dashhead"><div><span>{t.category}</span><h3>{t.title}</h3></div><b>{p.responses} respostas</b></div><div className="bars">{choices.map(c=>{const n=p.counts[c.id]??0;const pct=p.percentages?.[c.id];return <div className="barrow" key={c.id}><div><span>{c.label}</span><strong>{String(n)}{pct!==undefined?` · ${pct}%`:''}</strong></div>{pct!==undefined&&<div className="bar"><i style={{width:`${pct}%`}}/></div>}</div>})}</div></article>})}</div></section>}
 </main>
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);