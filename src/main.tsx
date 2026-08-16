import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import { devices, type ManifestationChoice } from './data';
import {
  backendStatus, createRemoteDraft, finalizeRemoteDraft, loadFinalReceipt, loadParticipant,
  loadPublicPanel, loadRemoteSession, loadResponses, resumeRemoteDraft, saveFinalReceipt,
  saveParticipant, saveRemoteDraft, saveResponses, type FinalReceipt, type Participant,
  type PublicPanel, type RemoteSession, type Responses
} from './lib/data';

const OFFICE_EMAIL='tercio@tercioguilhermeadv.com';
const choices: {id: ManifestationChoice; label: string; hint: string}[] = [
  {id:'agree',label:'Concordo',hint:'O texto pode permanecer como está.'},
  {id:'change',label:'Alterar',hint:'Quero propor uma redação diferente.'},
  {id:'exclude',label:'Excluir',hint:'Entendo que este dispositivo deve ser retirado.'},
  {id:'observe',label:'Observação',hint:'Quero registrar uma consideração sobre este ponto.'},
  {id:'abstain',label:'Não quero me manifestar a respeito',hint:'Analisei este ponto e escolho não me posicionar.'},
];
const apartments=Array.from({length:10},(_,floor)=>Array.from({length:10},(_,unit)=>`${floor}${String(unit+1).padStart(2,'0')}`)).flat();
const labelFor=(choice:ManifestationChoice)=>choices.find(item=>item.id===choice)?.label??choice;
const typeLabel=(role:Participant['role'])=>role==='owner'?'Proprietário(a)':'Inquilino(a)';

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
 const [panelError,setPanelError]=React.useState(false);
 const current=devices[index];
 const response=responses[current.id];
 const relevant=devices.filter(d=>['change','exclude','observe'].includes(responses[d.id]?.choice));
 const answered=Object.keys(responses).length;
 const progress=devices.length?Math.round((answered/devices.length)*100):0;
 const identificationReady=participant.name.trim().length>2;
 const canEdit=remoteSession?.status==='draft'&&!finalReceipt&&saveState!=='finalizing';
 const isConflicted=finalReceipt?.status==='conflicted';
 const timestamp=new Date().toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'medium'});

 const refreshPanel=React.useCallback(async()=>{
   try{setPanel(await loadPublicPanel());setPanelError(false)}catch{setPanelError(true)}
 },[]);

 React.useEffect(()=>{saveResponses(responses)},[responses]);
 React.useEffect(()=>{saveParticipant(participant)},[participant]);
 React.useEffect(()=>{refreshPanel()},[refreshPanel]);
 React.useEffect(()=>{
   if(!remoteSession||remoteSession.status!=='draft'){setHydrated(true);return}
   let active=true;
   setSaveState('loading');
   resumeRemoteDraft(remoteSession).then(remote=>{
     if(!active)return;
     setParticipant(remote.participant);
     setResponses(local=>Object.keys(local).length?local:remote.responses);
     setLastSavedAt(remote.lastSavedAt);
     setSaveState('ready');
     setHydrated(true);
   }).catch(()=>{if(active){setSaveState('error');setHydrated(true)}});
   return()=>{active=false};
 },[]);
 React.useEffect(()=>{
   if(!remoteSession||remoteSession.status!=='draft'||!hydrated||finalReceipt)return;
   const timer=window.setTimeout(async()=>{
     setSaveState('saving');
     try{
       const saved=await saveRemoteDraft(remoteSession,responses);
       setLastSavedAt(saved);
       setRemoteSession({...remoteSession,lastSavedAt:saved});
       setSaveState('saved');
     }catch{setSaveState('error')}
   },1200);
   return()=>window.clearTimeout(timer);
 },[responses,remoteSession?.participantId,hydrated,finalReceipt]);

 const startParticipation=async(newVersion=false)=>{
   if(!identificationReady){document.getElementById('identificacao')?.scrollIntoView({behavior:'smooth'});return}
   setSaveState('loading');
   try{
     if(newVersion){saveFinalReceipt(null);setFinalReceipt(null)}
     const session=await createRemoteDraft(participant);
     setRemoteSession(session);setLastSavedAt(session.lastSavedAt);setHydrated(true);setSaveState('ready');
     if(Object.keys(responses).length){const saved=await saveRemoteDraft(session,responses);setLastSavedAt(saved);setSaveState('saved')}
     if(!newVersion)document.getElementById('consulta')?.scrollIntoView({behavior:'smooth'});
   }catch{setSaveState('error');alert('Não foi possível iniciar o salvamento seguro agora. Seus dados locais continuam neste navegador.')}
 };
 const choose=(choice:ManifestationChoice)=>{if(canEdit)setResponses(old=>({...old,[current.id]:{...old[current.id],choice}}))};
 const comment=(text:string)=>{if(canEdit)setResponses(old=>({...old,[current.id]:{...old[current.id],choice:old[current.id]?.choice??'observe',comment:text}}))};
 const go=(next:number)=>{setIndex(Math.max(0,Math.min(devices.length-1,next)));document.getElementById('consulta')?.scrollIntoView({behavior:'smooth'})};
 const finalize=async()=>{
   if(!remoteSession||remoteSession.status!=='draft'||!answered)return;
   if(!window.confirm('Finalizar esta manifestação? O registro ficará auditável e não poderá ser alterado diretamente. Se houver outra manifestação para a mesma unidade, ambas ficarão aguardando validação e não entrarão no painel até a resolução do conflito.'))return;
   setSaveState('finalizing');
   try{
     const receipt=await finalizeRemoteDraft(remoteSession,responses);
     setFinalReceipt(receipt);
     setRemoteSession({...remoteSession,status:receipt.status});
     setSaveState(receipt.status==='conflicted'?'conflicted':'finalized');
     await refreshPanel();
   }catch{setSaveState('error');alert('Não foi possível finalizar. Tente novamente; o rascunho permanece salvo.')}
 };
 const manifestationText=()=>{
   const statusLine=isConflicted?'Situação na consulta: aguardando validação de legitimidade da unidade\n':'Situação na consulta: manifestação final vigente\n';
   const proof=finalReceipt?`Protocolo: ${finalReceipt.protocolId}\nHash de integridade (SHA-256): ${finalReceipt.payloadHash}\nRegistrado em: ${new Date(finalReceipt.finalizedAt).toLocaleString('pt-BR')}\n${statusLine}\n`:'';
   const header=`MANIFESTAÇÃO SOBRE A MINUTA DO REGIMENTO INTERNO — TORRES DE OLINDA\n\nResponsável informado: ${participant.name}\nQualificação declarada: ${typeLabel(participant.role)}\nUnidade: Torre ${participant.tower} — Apto. ${participant.apartment}\n${proof}`;
   const body=relevant.map(d=>{const r=responses[d.id];return `Art. ${d.article}${d.subdivision?`, ${d.subdivision}`:''} — ${labelFor(r.choice)}\nTexto de referência: ${d.text}\nManifestação: ${r.comment?.trim()||'(sem texto adicional)'}\n`}).join('\n');
   return header+(body||'Nenhum pedido de alteração, exclusão ou observação foi registrado.')+'\n\nDocumento gerado pelo Torres em Comum. O hash acima corresponde ao registro armazenado para auditoria.';
 };
 const openEmail=()=>{
   if(!finalReceipt)return;
   const subject=`Manifestação sobre Regimento Interno — Torre ${participant.tower} Apto ${participant.apartment} — ${finalReceipt.protocolId}`;
   window.location.href=`mailto:${OFFICE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(manifestationText())}`;
 };
 const printDocument=()=>{if(finalReceipt)window.print()};
 const saveLabel=isConflicted?'Registro preservado · aguardando validação':finalReceipt?'Manifestação finalizada':saveState==='saving'?'Salvando rascunho…':saveState==='saved'||saveState==='ready'?'Rascunho salvo com segurança':saveState==='loading'?'Conectando ao salvamento seguro…':saveState==='error'?'Falha no salvamento remoto — cópia local preservada':'Ainda não iniciado no banco central';

 return <main>
  <header className="top"><a className="brand" href="#">TORRES <span>EM COMUM</span></a><nav><a href="#identificacao">Identificação</a><a href="#consulta">Consulta</a><a href="#manifestacao">Minha manifestação</a><a href="#painel">Painel</a></nav></header>
  <section className="hero"><div><p className="eyebrow">CONSTRUÇÃO PARTICIPATIVA DO REGIMENTO INTERNO</p><h1>As regras do lugar onde vivemos também podem ser construídas <em>em comum.</em></h1><p className="lead">Leia a minuta por assuntos, entenda cada regra em linguagem simples, registre sua posição e organize suas manifestações para formalização pelos canais definidos pelo condomínio.</p><a className="primary" href="#identificacao">Começar minha participação →</a></div><div className="mosaic" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div></section>
  <section id="identificacao" className="identification"><div className="sectionhead"><div><p className="eyebrow">SUA UNIDADE</p><h2>Antes de começar, identifique a manifestação.</h2></div><span>Identificação declaratória</span></div><div className="identityform"><label>Nome do responsável<input disabled={!!remoteSession} value={participant.name} onChange={e=>setParticipant({...participant,name:e.target.value})} placeholder="Nome completo"/></label><label>Torre<select disabled={!!remoteSession} value={participant.tower} onChange={e=>setParticipant({...participant,tower:e.target.value as Participant['tower']})}>{['A','B','C','D'].map(t=><option key={t}>{t}</option>)}</select></label><label>Apartamento<select disabled={!!remoteSession} value={participant.apartment} onChange={e=>setParticipant({...participant,apartment:e.target.value})}>{apartments.map(a=><option key={a}>{a}</option>)}</select></label><fieldset disabled={!!remoteSession}><legend>Vínculo com a unidade</legend><label><input type="radio" checked={participant.role==='owner'} onChange={()=>setParticipant({...participant,role:'owner'})}/> Proprietário(a)</label><label><input type="radio" checked={participant.role==='tenant'} onChange={()=>setParticipant({...participant,role:'tenant'})}/> Inquilino(a)</label></fieldset></div><p className="privacyhint">A identificação é declaratória: a plataforma não comprova a titularidade do imóvel. Vale uma manifestação vigente por unidade. Se duas pessoas finalizarem para o mesmo apartamento, ambas ficam temporariamente fora dos resultados até validação de legitimidade; após validação, o proprietário comprovado prevalece sobre o inquilino. Nome e unidade ficam em área privada e não aparecem no painel público.</p>{!remoteSession&&<button className="primary identitystart" disabled={!identificationReady||saveState==='loading'} onClick={()=>startParticipation(false)}>Salvar identificação e começar →</button>}<div className={`savestatus ${saveState==='error'?'error':''} ${isConflicted?'conflicted':''}`}><strong>{saveLabel}</strong>{lastSavedAt&&!finalReceipt&&<span>Último salvamento: {new Date(lastSavedAt).toLocaleString('pt-BR')}</span>}{remoteSession&&<span>Protocolo: {remoteSession.protocolId}</span>}</div>{isConflicted&&<div className="conflictbox"><strong>Esta unidade tem mais de uma manifestação.</strong><p>Seu registro foi preservado com protocolo e hash, mas não está sendo contado no painel enquanto a legitimidade da unidade não for validada. Nenhum dos registros concorrentes é privilegiado apenas pela declaração de ser proprietário.</p></div>}</section>
  <section id="como" className="steps"><article><b>01</b><h2>Entenda</h2><p>Leia o texto original e uma explicação em linguagem simples, sem substituir a minuta.</p></article><article><b>02</b><h2>Participe</h2><p>Suas escolhas ficam salvas no navegador e, após iniciar, também em um rascunho remoto protegido.</p></article><article><b>03</b><h2>Formalize</h2><p>Revise, finalize, receba protocolo e hash de integridade e encaminhe pelo canal oficial.</p></article></section>
  <section id="consulta" className="consult"><div className="sectionhead"><div><p className="eyebrow">CONSULTA À MINUTA</p><h2>Analise dispositivo por dispositivo.</h2></div><span>{answered} de {devices.length} analisados · {progress}%</span></div><div className="progress"><i style={{width:`${progress}%`}}/></div>{!canEdit&&!finalReceipt&&<div className="gate"><strong>Ative o salvamento seguro antes de responder.</strong><p>Preencha sua identificação acima e clique em “Salvar identificação e começar”.</p></div>}<article className={`device ${!canEdit?'locked':''}`}><div className="crumb">{current.theme}{current.section?` · ${current.section}`:''}</div><h3>Art. {current.article}{current.subdivision?`, ${current.subdivision}`:''}</h3><p className="hierarchy">{current.title}{current.chapter?` · ${current.chapter}`:''}</p><div className="sourceblock"><span>Texto original da minuta</span><p className="legal">{current.text}</p></div>{current.plainLanguage&&<details className="plainlanguage" open><summary>Entenda esta regra</summary><p>{current.plainLanguage}</p>{current.translationNote&&<aside><strong>Atenção à redação:</strong> {current.translationNote}</aside>}<small>Esta explicação busca apenas tornar a redação mais acessível. O texto original acima continua sendo a referência da consulta.</small></details>}<div className="options">{choices.map(c=><button disabled={!canEdit} key={c.id} className={response?.choice===c.id?'selected':''} onClick={()=>choose(c.id)}><strong>{c.label}</strong><small>{c.hint}</small></button>)}</div>{response&&['change','exclude','observe'].includes(response.choice)&&<label className="comment">Sua manifestação<textarea disabled={!canEdit} value={response.comment||''} onChange={e=>comment(e.target.value)} placeholder={response.choice==='change'?'Escreva a redação ou alteração que você propõe.':'Explique sua manifestação. Você poderá revisar antes de formalizar.'}/><small>Evite incluir CPF, telefone, dados de crianças, informações de saúde ou dados pessoais de terceiros.</small></label>}<div className="pager"><button disabled={index===0} onClick={()=>go(index-1)}>← Anterior</button><span>{index+1} / {devices.length}</span><button disabled={index===devices.length-1} onClick={()=>go(index+1)}>Próximo →</button></div></article></section>
  <section id="manifestacao" className="review printable"><div className="sectionhead"><div><p className="eyebrow">MINHA MANIFESTAÇÃO</p><h2>Revise o que será formalizado.</h2></div><span>{relevant.length} manifestação(ões) textual(is) · {answered} resposta(s)</span></div><div className="documentmeta"><strong>{participant.name||'Responsável ainda não informado'}</strong><span>{typeLabel(participant.role)} · Torre {participant.tower} · Apto. {participant.apartment}</span>{finalReceipt?<><span>Protocolo: {finalReceipt.protocolId}</span><span>Registrado em {new Date(finalReceipt.finalizedAt).toLocaleString('pt-BR')}</span></>:<span>Rascunho · {timestamp}</span>}</div>{finalReceipt&&<div className={`receipt ${isConflicted?'conflicted':''}`}><strong>{isConflicted?'Registro auditável aguardando validação':'Registro final auditável'}</strong><span>SHA-256</span><code>{finalReceipt.payloadHash}</code><p>{isConflicted?'O registro está preservado, mas não integra o painel enquanto houver conflito de legitimidade para esta unidade.':'Este hash é calculado no servidor sobre o registro final armazenado e serve para verificar sua integridade.'}</p></div>}{relevant.length===0?<p className="empty">Você ainda não registrou pedidos de alteração, exclusão ou observações. Concordâncias e escolhas por não se manifestar continuam registradas na contagem de respostas.</p>:<div className="reviewlist">{relevant.map(d=>{const r=responses[d.id];return <article key={d.id}><div><span>{d.theme}</span><h3>Art. {d.article}{d.subdivision?`, ${d.subdivision}`:''}</h3></div><strong>{labelFor(r.choice)}</strong><p className="original">{d.text}</p>{r.comment&&<p className="usertext">{r.comment}</p>}{canEdit&&<button className="no-print" onClick={()=>{setIndex(devices.indexOf(d));document.getElementById('consulta')?.scrollIntoView({behavior:'smooth'})}}>Editar manifestação</button>}</article>})}</div>}{!finalReceipt?<div className="finalactions no-print"><button className="send" disabled={!remoteSession||!answered||saveState==='finalizing'} onClick={finalize}>{saveState==='finalizing'?'Finalizando…':'Finalizar manifestação e gerar protocolo →'}</button></div>:<><div className="finalactions no-print"><button onClick={printDocument}>Gerar / salvar PDF</button><button className="send" onClick={openEmail}>Abrir e-mail oficial →</button>{!isConflicted&&<button onClick={()=>startParticipation(true)}>Criar nova versão</button>}</div><p className="emailnote no-print">O e-mail é aberto para <strong>{OFFICE_EMAIL}</strong> com protocolo e texto preenchidos. {isConflicted?'O documento informa que a manifestação está aguardando validação dentro da consulta.':'O registro anterior permanece no histórico se você optar por criar uma nova versão.'}</p></>}</section>
  <section id="painel" className="dashboard no-print"><div className="sectionhead"><div><p className="eyebrow">PAINEL AGREGADO</p><h2>O que a coletividade está dizendo.</h2></div><span>{backendStatus.label}</span></div><p className="dashboardintro">Nenhum nome, apartamento, comentário individual ou recorte por torre é publicado. Um dispositivo só aparece depois de pelo menos 5 respostas. Categorias com menos de 5 respostas têm a contagem suprimida.</p>{typeof panel?.participatingUnits==='number'&&<p className="participating"><strong>{panel.participatingUnits}</strong> unidades com manifestação final vigente.</p>}{typeof panel?.unitsAwaitingValidation==='number'&&panel.unitsAwaitingValidation>0&&<p className="pendingvalidation"><strong>{panel.unitsAwaitingValidation}</strong> unidade(s) com conflito de legitimidade aguardando validação; essas manifestações não entram nas estatísticas.</p>}{panelError?<p className="empty">O painel público não pôde ser carregado agora.</p>:!panel||panel.devices.length===0?<p className="empty">Ainda não há grupos com respostas suficientes para publicação. O mínimo público é de 5 respostas.</p>:<div className="dashboardgrid">{panel.devices.map(row=>{const device=devices.find(d=>d.id===row.deviceId);if(!device)return null;return <article key={row.deviceId} className="dashcard"><div className="dashhead"><div><span>{device.theme}</span><h3>Art. {device.article}{device.subdivision?`, ${device.subdivision}`:''}</h3></div><b>{row.responses} resposta(s)</b></div><div className="bars">{choices.map(choice=>{const count=row.counts[choice.id]??0;const pct=row.percentages?.[choice.id];return <div key={choice.id} className="barrow"><div><span>{choice.label}</span><strong>{count}{typeof pct==='number'?` · ${pct}%`:count==='<5'?' · suprimido':''}</strong></div>{typeof pct==='number'&&<div className="bar"><i style={{width:`${pct}%`}}/></div>}</div>})}</div>{row.suppressed&&<small className="suppression">Há categorias com menos de 5 respostas; totais e percentuais capazes de revelar essas contagens foram omitidos.</small>}</article>})}</div>}</section>
  <section className="notice no-print"><strong>Transparência sem exposição.</strong><p>O registro individual é privado e auditável. O painel recebe somente resultados agregados sujeitos ao limiar mínimo de publicação.</p></section>
  <footer className="no-print"><p><strong>Torres em Comum</strong><br/>Construção participativa do Regimento Interno</p><p>Esta plataforma organiza manifestações e não substitui a Assembleia Geral nem o canal oficial indicado pelo condomínio.</p></footer>
 </main>
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
