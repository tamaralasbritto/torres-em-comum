import React from 'react';
import ReactDOM from 'react-dom/client';
import './topic.css';
import { type ManifestationChoice } from './data';
import { decisionTopics, topicDevices } from './data/topics';
import {
  backendStatus, createRemoteDraft, finalizeRemoteDraft, loadFinalReceipt, loadParticipant,
  loadPublicPanel, loadRemoteSession, loadResponses, resumeRemoteDraft, saveFinalReceipt,
  saveParticipant, saveResponses, saveRemoteDraft, type FinalReceipt, type Participant,
  type PublicPanel, type RemoteSession, type Responses
} from './lib/data';

const OFFICE_EMAIL='tercio@tercioguilhermeadv.com';
const choices:{id:ManifestationChoice;label:string;hint:string}[]=[
 {id:'agree',label:'Concordo',hint:'Pode ficar como está.'},
 {id:'change',label:'Quero alterar',hint:'Concordo com o tema, mas mudaria a regra.'},
 {id:'exclude',label:'Quero excluir',hint:'Entendo que essa regra não deveria constar.'},
 {id:'observe',label:'Tenho uma observação',hint:'Quero registrar um ponto sem pedir exclusão.'},
];
const apartments=Array.from({length:10},(_,floor)=>Array.from({length:10},(_,unit)=>`${floor}${String(unit+1).padStart(2,'0')}`)).flat();
const typeLabel=(role:Participant['role'])=>role==='owner'?'Proprietário(a)':'Inquilino(a)';
const labelFor=(choice?:ManifestationChoice)=>choices.find(c=>c.id===choice)?.label??'';
type SaveState='local'|'loading'|'ready'|'saving'|'saved'|'error'|'finalizing'|'finalized'|'conflicted';

function App(){
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
 const representative=currentDevices[0];
 const currentResponse=representative?responses[representative.id]:undefined;
 const topicAnswered=(topic:typeof current)=>{const first=topic.deviceIds[0];return !!first&&!!responses[first]?.choice};
 const answered=decisionTopics.filter(topicAnswered).length;
 const progress=Math.round(answered/decisionTopics.length*100);
 const minutes=Math.max(1,Math.ceil((decisionTopics.length-answered)*0.55));
 const identificationReady=participant.name.trim().length>2;
 const canEdit=remoteSession?.status==='draft'&&!finalReceipt&&saveState!=='finalizing';
 const changedTopics=decisionTopics.filter(t=>{const r=responses[t.deviceIds[0]];return r&&['change','exclude','observe'].includes(r.choice)});

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

 const start=async()=>{
   if(!identificationReady)return;
   setSaveState('loading');
   try{const session=await createRemoteDraft(participant);setRemoteSession(session);setHydrated(true);setLastSavedAt(session.lastSavedAt);setSaveState('ready');if(Object.keys(responses).length)await saveRemoteDraft(session,responses);document.getElementById('consulta')?.scrollIntoView({behavior:'smooth'})}
   catch{setSaveState('error')}
 };
 const setTopicResponse=(choice:ManifestationChoice,comment?:string)=>{
   if(!canEdit)return;
   setResponses(old=>{const next={...old};for(const id of current.deviceIds)next[id]={choice,comment:comment??old[id]?.comment};return next});
 };
 const setComment=(comment:string)=>{if(currentResponse)setTopicResponse(currentResponse.choice,comment)};
 const go=(n:number)=>{setIndex(Math.max(0,Math.min(decisionTopics.length-1,n)));document.getElementById('consulta')?.scrollIntoView({behavior:'smooth'})};
 const skip=()=>go(index+1);
 const finalize=async()=>{
   if(!remoteSession||!answered)return;
   if(!confirm(`Finalizar sua manifestação com ${answered} de ${decisionTopics.length} assuntos respondidos? Os assuntos pulados serão considerados sem manifestação.`))return;
   setSaveState('finalizing');
   try{const receipt=await finalizeRemoteDraft(remoteSession,responses);setFinalReceipt(receipt);setRemoteSession({...remoteSession,status:receipt.status});setSaveState(receipt.status==='conflicted'?'conflicted':'finalized');setPanel(await loadPublicPanel())}
   catch{setSaveState('error')}
 };
 const manifestationText=()=>{
   const proof=finalReceipt?`Protocolo: ${finalReceipt.protocolId}\nHash SHA-256: ${finalReceipt.payloadHash}\nRegistrado em: ${new Date(finalReceipt.finalizedAt).toLocaleString('pt-BR')}\n\n`:'';
   const body=changedTopics.map(t=>{const r=responses[t.deviceIds[0]];const arts=[...new Set(topicDevices(t).map(d=>d.article))];return `${t.category} — ${t.title}\nArtigos relacionados: ${arts.join(', ')}\nPosição: ${labelFor(r?.choice)}\nManifestação: ${r?.comment?.trim()||'(sem texto adicional)'}\n`}).join('\n');
   return `MANIFESTAÇÃO SOBRE A MINUTA DO REGIMENTO INTERNO — TORRES DE OLINDA\n\nResponsável informado: ${participant.name}\nQualificação declarada: ${typeLabel(participant.role)}\nUnidade: Torre ${participant.tower} — Apto. ${participant.apartment}\n${proof}${body||'Nenhum pedido de alteração, exclusão ou observação foi registrado.'}`;
 };
 const openEmail=()=>{if(!finalReceipt)return;window.location.href=`mailto:${OFFICE_EMAIL}?subject=${encodeURIComponent(`Manifestação Regimento — Torre ${participant.tower} Apto ${participant.apartment}`)}&body=${encodeURIComponent(manifestationText())}`};
 const saveLabel=finalReceipt?.status==='conflicted'?'Finalizado · aguardando validação':finalReceipt?'Manifestação finalizada':saveState==='saving'?'Salvando…':saveState==='saved'||saveState==='ready'?'Rascunho salvo':saveState==='error'?'Cópia local preservada · falha no remoto':saveState==='loading'?'Conectando…':'Ainda não iniciado';
 const panelFor=(topic:typeof current)=>panel?.devices.find(p=>p.deviceId===topic.deviceIds[0]);

 return <main>
  <header className="top"><a className="brand" href="#">TORRES <span>EM COMUM</span></a><nav><a href="#identificacao">Minha unidade</a><a href="#consulta">Consulta</a><a href="#manifestacao">Resumo</a><a href="#painel">Resultados</a></nav></header>
  <section className="hero compacthero"><div><p className="eyebrow">CONSTRUÇÃO PARTICIPATIVA DO REGIMENTO INTERNO</p><h1>Opine sobre as regras que vão organizar <em>nossa convivência.</em></h1><p className="lead">A minuta tem 209 artigos e 450 dispositivos. Para tornar a participação viável, os dispositivos relacionados foram organizados em <strong>{decisionTopics.length} decisões por assunto</strong>. Em cada decisão, o texto da minuta é sempre apresentado antes de qualquer explicação.</p><a className="primary" href="#identificacao">Participar · cerca de 30 minutos →</a></div><div className="mosaic" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div></section>

  <section id="identificacao" className="identification"><div className="sectionhead"><div><p className="eyebrow">SUA UNIDADE</p><h2>Quem está se manifestando?</h2></div><span>Dados privados</span></div><div className="identityform"><label>Nome do responsável<input disabled={!!remoteSession} value={participant.name} onChange={e=>setParticipant({...participant,name:e.target.value})}/></label><label>Torre<select disabled={!!remoteSession} value={participant.tower} onChange={e=>setParticipant({...participant,tower:e.target.value as Participant['tower']})}>{['A','B','C','D'].map(t=><option key={t}>{t}</option>)}</select></label><label>Apartamento<select disabled={!!remoteSession} value={participant.apartment} onChange={e=>setParticipant({...participant,apartment:e.target.value})}>{apartments.map(a=><option key={a}>{a}</option>)}</select></label><fieldset disabled={!!remoteSession}><legend>Vínculo</legend><label><input type="radio" checked={participant.role==='owner'} onChange={()=>setParticipant({...participant,role:'owner'})}/> Proprietário(a)</label><label><input type="radio" checked={participant.role==='tenant'} onChange={()=>setParticipant({...participant,role:'tenant'})}/> Inquilino(a)</label></fieldset></div><p className="privacyhint">Nome e unidade não aparecem nos resultados públicos. Se houver duas manifestações para o mesmo apartamento, ambas ficam fora da contagem até validação.</p>{!remoteSession&&<button className="primary identitystart" disabled={!identificationReady||saveState==='loading'} onClick={start}>Salvar e começar →</button>}<div className="savestatus"><strong>{saveLabel}</strong>{lastSavedAt&&!finalReceipt&&<span>Último salvamento: {new Date(lastSavedAt).toLocaleString('pt-BR')}</span>}{remoteSession&&<span>Protocolo: {remoteSession.protocolId}</span>}</div></section>

  <section id="consulta" className="consult topicconsult"><div className="sectionhead"><div><p className="eyebrow">CONSULTA POR ASSUNTOS</p><h2>{answered} de {decisionTopics.length} decisões</h2></div><span>~{minutes} min restantes</span></div><div className="progress"><i style={{width:`${progress}%`}}/></div><div className="topiclayout"><aside className="topicnav">{[...new Set(decisionTopics.map(t=>t.category))].map(cat=><div key={cat}><strong>{cat}</strong>{decisionTopics.map((t,i)=>t.category===cat&&<button key={t.id} className={`${i===index?'active':''} ${topicAnswered(t)?'done':''}`} onClick={()=>go(i)}>{topicAnswered(t)?'✓ ':''}{t.title}</button>)}</div>)}</aside><article className={`device topiccard ${!canEdit?'locked':''}`}><div className="crumb">{current.category}</div><h3>{current.title}</h3><p className="articlecount">Esta decisão reúne {currentDevices.length} dispositivo(s) da minuta · arts. {[...new Set(currentDevices.map(d=>d.article))].join(', ')}</p><div className="minutastack">{currentDevices.map(d=><article className="minutaitem" key={d.id}><div className="minutaheading"><span>Texto da minuta</span><strong>Art. {d.article}{d.subdivision?`, ${d.subdivision}`:''}</strong></div><p className="legal">{d.text}</p>{d.plainLanguage&&<details className="meaningdetails"><summary>O que isso quer dizer?</summary><p>{d.plainLanguage}</p><small>Esta explicação serve apenas para facilitar a leitura. O texto da minuta acima é a referência da consulta.</small></details>}{d.translationNote&&<details className="wordingdetails"><summary>⚠ Ponto de atenção na redação</summary><p>{d.translationNote}</p><small>Este aviso sinaliza apenas uma ambiguidade, inconsistência ou referência interna encontrada no texto recebido; ele não altera a minuta.</small></details>}</article>)}</div>{!canEdit&&!finalReceipt&&<div className="gate"><strong>Salve sua identificação acima para responder.</strong></div>}<div className="decisionprompt"><strong>Sua posição sobre este conjunto de dispositivos</strong><small>A escolha será registrada para todos os dispositivos listados acima.</small></div><div className="options topicoptions">{choices.map(c=><button disabled={!canEdit} key={c.id} className={currentResponse?.choice===c.id?'selected':''} onClick={()=>setTopicResponse(c.id)}><strong>{c.label}</strong><small>{c.hint}</small></button>)}</div>{currentResponse&&['change','exclude','observe'].includes(currentResponse.choice)&&<label className="comment">Explique seu ponto<textarea disabled={!canEdit} value={currentResponse.comment||''} onChange={e=>setComment(e.target.value)} placeholder="Escreva em linguagem simples. Não precisa redigir juridicamente."/><small>Evite dados pessoais seus ou de terceiros.</small></label>}<div className="topicpager"><button disabled={index===0} onClick={()=>go(index-1)}>← Anterior</button><button className="skip" disabled={index===decisionTopics.length-1} onClick={skip}>{currentResponse?'Próximo →':'Pular por enquanto →'}</button></div></article></div></section>

  <section id="manifestacao" className="review printable"><div className="sectionhead"><div><p className="eyebrow">SEU RESUMO</p><h2>{answered} assunto(s) respondido(s)</h2></div><span>{changedTopics.length} ponto(s) para revisão</span></div>{changedTopics.length===0?<p className="empty">Você ainda não registrou pedido de alteração, exclusão ou observação.</p>:<div className="reviewlist">{changedTopics.map(t=>{const r=responses[t.deviceIds[0]];return <article key={t.id}><span>{t.category}</span><h3>{t.title}</h3><strong>{labelFor(r?.choice)}</strong><p>{r?.comment||'Sem texto adicional.'}</p><button className="no-print" onClick={()=>go(decisionTopics.indexOf(t))}>Editar</button></article>})}</div>} {!finalReceipt&&remoteSession&&<div className="finalactions no-print"><button className="send" disabled={!answered||saveState==='finalizing'} onClick={finalize}>{saveState==='finalizing'?'Finalizando…':'Finalizar manifestação →'}</button></div>}{finalReceipt&&<><div className="receipt"><strong>Protocolo</strong><code>{finalReceipt.protocolId}</code><strong>Hash de integridade</strong><code>{finalReceipt.payloadHash}</code>{finalReceipt.status==='conflicted'&&<p>Esta unidade está aguardando validação de legitimidade e ainda não entra nos resultados.</p>}</div><div className="finalactions no-print"><button onClick={()=>window.print()}>Salvar PDF</button><button className="send" onClick={openEmail}>Abrir e-mail oficial →</button></div></>}</section>

  <section id="painel" className="dashboard no-print"><div className="sectionhead"><div><p className="eyebrow">RESULTADOS PÚBLICOS</p><h2>O que o condomínio está dizendo.</h2></div><span>{backendStatus.label}</span></div><p className="dashboardintro">Só aparecem resultados com pelo menos 5 respostas. Dados pessoais e unidades não são exibidos.</p><div className="dashboardgrid">{decisionTopics.map(t=>{const p=panelFor(t);if(!p)return null;return <article className="dashcard" key={t.id}><div className="dashhead"><div><span>{t.category}</span><h3>{t.title}</h3></div><b>{p.responses} respostas</b></div><div className="bars">{choices.map(c=>{const n=p.counts[c.id]??0;const pct=p.percentages?.[c.id];return <div className="barrow" key={c.id}><div><span>{c.label}</span><strong>{String(n)}{pct!==undefined?` · ${pct}%`:''}</strong></div>{pct!==undefined&&<div className="bar"><i style={{width:`${pct}%`}}/></div>}</div>})}</div></article>})}</div></section>
  <footer className="no-print"><p><strong>Torres em Comum</strong><br/>Construção participativa do Regimento Interno</p><p>Os assuntos são apenas uma camada de organização. O texto original da minuta é apresentado como referência e o registro auditável permanece vinculado a cada dispositivo.</p></footer>
 </main>
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
