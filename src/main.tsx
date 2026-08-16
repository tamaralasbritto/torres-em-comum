import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import { devices, type ManifestationChoice } from './data/regimento';
import { backendStatus, loadAggregate, loadParticipant, loadResponses, saveParticipant, saveResponses, type Participant, type Responses } from './lib/data';

const OFFICE_EMAIL='tercio@tercioguilhermeadv.com';
const choices: {id: ManifestationChoice; label: string; hint: string}[] = [
  {id:'agree',label:'Concordo',hint:'O texto pode permanecer como está.'},
  {id:'change',label:'Alterar',hint:'Quero propor uma redação diferente.'},
  {id:'exclude',label:'Excluir',hint:'Entendo que este dispositivo deve ser retirado.'},
  {id:'observe',label:'Observação',hint:'Quero registrar uma consideração sobre este ponto.'},
  {id:'abstain',label:'Não quero me manifestar a respeito',hint:'Analisei este ponto e escolho não me posicionar.'},
];
const apartments=Array.from({length:10},(_,floor)=>Array.from({length:10},(_,unit)=>`${floor}${String(unit+1).padStart(2,'0')}`)).flat();
const labelFor = (choice: ManifestationChoice) => choices.find(item => item.id === choice)?.label ?? choice;
const typeLabel = (role: Participant['role']) => role === 'owner' ? 'Proprietário(a)' : 'Inquilino(a)';

function App(){
 const [index,setIndex]=React.useState(0);
 const [participant,setParticipant]=React.useState<Participant>(()=>loadParticipant() ?? {tower:'A',apartment:'001',name:'',role:'owner'});
 const [responses,setResponses]=React.useState<Responses>(()=>loadResponses());
 const [,forceDataRefresh]=React.useReducer(x=>x+1,0);
 const current=devices[index];
 const response=responses[current.id];
 const relevant=devices.filter(d=>['change','exclude','observe'].includes(responses[d.id]?.choice));
 const answered=Object.keys(responses).length;
 const progress=Math.round((answered/devices.length)*100);
 const identificationReady=participant.name.trim().length>2;
 const timestamp=new Date().toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'medium'});
 const aggregate=loadAggregate();
 const aggregateRows=devices.filter(d=>aggregate[d.id]).map(d=>({device:d,counts:aggregate[d.id]}));

 React.useEffect(()=>saveResponses(responses),[responses]);
 React.useEffect(()=>saveParticipant(participant),[participant]);
 React.useEffect(()=>{const fn=()=>forceDataRefresh();window.addEventListener('torres:data',fn);return()=>window.removeEventListener('torres:data',fn)},[]);
 const choose=(choice:ManifestationChoice)=>setResponses(old=>({...old,[current.id]:{...old[current.id],choice}}));
 const comment=(text:string)=>setResponses(old=>({...old,[current.id]:{...old[current.id],choice:old[current.id]?.choice ?? 'observe',comment:text}}));
 const go=(next:number)=>{setIndex(Math.max(0,Math.min(devices.length-1,next))); document.getElementById('consulta')?.scrollIntoView({behavior:'smooth'});};
 const manifestationText=()=>{
   const header=`MANIFESTAÇÃO SOBRE A MINUTA DO REGIMENTO INTERNO — TORRES DE OLINDA\n\nResponsável informado: ${participant.name}\nQualificação: ${typeLabel(participant.role)}\nUnidade: Torre ${participant.tower} — Apto. ${participant.apartment}\nData e hora de geração: ${timestamp}\n\n`;
   const body=relevant.map(d=>{const r=responses[d.id]; return `Art. ${d.article}${d.subdivision?`, ${d.subdivision}`:''} — ${labelFor(r.choice)}\nTexto de referência: ${d.text}\nManifestação: ${r.comment?.trim() || '(sem texto adicional)'}\n`;}).join('\n');
   return header + (body || 'Nenhuma manifestação de alteração, exclusão ou observação foi registrada.') + '\n\nDocumento gerado pelo Torres em Comum para organização da manifestação do responsável informado pela unidade.';
 };
 const openEmail=()=>{
   if(!identificationReady) return document.getElementById('identificacao')?.scrollIntoView({behavior:'smooth'});
   const subject=`Manifestação sobre Regimento Interno — Torre ${participant.tower} Apto ${participant.apartment}`;
   window.location.href=`mailto:${OFFICE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(manifestationText())}`;
 };
 const printDocument=()=> identificationReady ? window.print() : document.getElementById('identificacao')?.scrollIntoView({behavior:'smooth'});

 return <main>
  <header className="top"><a className="brand" href="#">TORRES <span>EM COMUM</span></a><nav><a href="#identificacao">Identificação</a><a href="#consulta">Consulta</a><a href="#manifestacao">Minha manifestação</a><a href="#painel">Painel</a></nav></header>
  <section className="hero"><div><p className="eyebrow">CONSTRUÇÃO PARTICIPATIVA DO REGIMENTO INTERNO</p><h1>As regras do lugar onde vivemos também podem ser construídas <em>em comum.</em></h1><p className="lead">Leia a minuta por assuntos, entenda cada regra em linguagem simples, registre sua posição e organize suas manifestações para formalização pelos canais definidos pelo condomínio.</p><a className="primary" href="#identificacao">Começar minha participação →</a></div><div className="mosaic" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div></section>
  <section id="identificacao" className="identification"><div className="sectionhead"><div><p className="eyebrow">SUA UNIDADE</p><h2>Antes de começar, identifique a manifestação.</h2></div><span>Identificação declaratória</span></div><div className="identityform"><label>Nome do responsável<input value={participant.name} onChange={e=>setParticipant({...participant,name:e.target.value})} placeholder="Nome completo"/></label><label>Torre<select value={participant.tower} onChange={e=>setParticipant({...participant,tower:e.target.value as Participant['tower']})}>{['A','B','C','D'].map(t=><option key={t}>{t}</option>)}</select></label><label>Apartamento<select value={participant.apartment} onChange={e=>setParticipant({...participant,apartment:e.target.value})}>{apartments.map(a=><option key={a}>{a}</option>)}</select></label><fieldset><legend>Vínculo com a unidade</legend><label><input type="radio" checked={participant.role==='owner'} onChange={()=>setParticipant({...participant,role:'owner'})}/> Proprietário(a)</label><label><input type="radio" checked={participant.role==='tenant'} onChange={()=>setParticipant({...participant,role:'tenant'})}/> Inquilino(a)</label></fieldset></div><p className="privacyhint">Esses dados identificam a manifestação da unidade. No painel público, resultados serão exibidos apenas de forma agregada.</p></section>
  <section id="como" className="steps"><article><b>01</b><h2>Entenda</h2><p>Leia o texto original e, quando disponível, abra uma explicação em linguagem simples.</p></article><article><b>02</b><h2>Participe</h2><p>Concorde, proponha alteração ou exclusão, registre observação ou escolha não se manifestar.</p></article><article><b>03</b><h2>Formalize</h2><p>Revise e gere um registro para encaminhar ao e-mail oficial.</p></article></section>
  <section id="consulta" className="consult"><div className="sectionhead"><div><p className="eyebrow">CONSULTA À MINUTA</p><h2>Analise dispositivo por dispositivo.</h2></div><span>{answered} de {devices.length} analisados · {progress}%</span></div><div className="progress"><i style={{width:`${progress}%`}}/></div><article className="device"><div className="crumb">{current.theme}{current.section ? ` · ${current.section}`:''}</div><h3>Art. {current.article}{current.subdivision ? `, ${current.subdivision}`:''}</h3><p className="hierarchy">{current.title}{current.chapter ? ` · ${current.chapter}`:''}</p><div className="sourceblock"><span>Texto original da minuta</span><p className="legal">{current.text}</p></div>{current.plainLanguage&&<details className="plainlanguage" open><summary>Entenda esta regra</summary><p>{current.plainLanguage}</p>{current.translationNote&&<aside><strong>Atenção à redação:</strong> {current.translationNote}</aside>}<small>Esta explicação busca apenas tornar a redação mais acessível. O texto original acima continua sendo a referência da consulta.</small></details>}<div className="options">{choices.map(c=><button key={c.id} className={response?.choice===c.id?'selected':''} onClick={()=>choose(c.id)}><strong>{c.label}</strong><small>{c.hint}</small></button>)}</div>{response && ['change','exclude','observe'].includes(response.choice)&&<label className="comment">Sua manifestação<textarea value={response.comment || ''} onChange={e=>comment(e.target.value)} placeholder={response.choice==='change'?'Escreva a redação ou alteração que você propõe.':'Explique sua manifestação. Você poderá revisar antes de formalizar.'}/></label>}<div className="pager"><button disabled={index===0} onClick={()=>go(index-1)}>← Anterior</button><span>{index+1} / {devices.length}</span><button disabled={index===devices.length-1} onClick={()=>go(index+1)}>Próximo →</button></div></article></section>
  <section id="manifestacao" className="review printable"><div className="sectionhead"><div><p className="eyebrow">MINHA MANIFESTAÇÃO</p><h2>Revise o que será formalizado.</h2></div><span>{relevant.length} manifestação(ões)</span></div><div className="documentmeta"><strong>{participant.name || 'Responsável ainda não informado'}</strong><span>{typeLabel(participant.role)} · Torre {participant.tower} · Apto. {participant.apartment}</span><span>Gerado em {timestamp}</span></div>{relevant.length===0?<p className="empty">Você ainda não registrou pedidos de alteração, exclusão ou observações.</p>:<div className="reviewlist">{relevant.map(d=>{const r=responses[d.id];return <article key={d.id}><div><span>{d.theme}</span><h3>Art. {d.article}{d.subdivision ? `, ${d.subdivision}`:''}</h3></div><strong>{labelFor(r.choice)}</strong><p className="original">{d.text}</p>{r.comment&&<p className="usertext">{r.comment}</p>}<button className="no-print" onClick={()=>{setIndex(devices.indexOf(d));document.getElementById('consulta')?.scrollIntoView({behavior:'smooth'})}}>Editar manifestação</button></article>})}</div>}<div className="finalactions no-print"><button onClick={printDocument}>Gerar / salvar PDF</button><button className="send" onClick={openEmail}>Abrir e-mail oficial →</button></div><p className="emailnote no-print">O botão abre uma nova mensagem para <strong>{OFFICE_EMAIL}</strong>, já com assunto e texto preenchidos. Se salvar esta página como PDF, você pode anexá-la ao e-mail antes de enviar.</p></section>
  <section id="painel" className="dashboard no-print"><div className="sectionhead"><div><p className="eyebrow">PAINEL AGREGADO</p><h2>O que a coletividade está dizendo.</h2></div><span>{backendStatus.label}</span></div><p className="dashboardintro">Esta prévia já usa a mesma estrutura que o painel público consultará no banco central. Enquanto o Supabase não estiver conectado, ela mostra apenas as respostas salvas neste navegador.</p><div className="dashboardgrid">{aggregateRows.length===0?<p className="empty">Ainda não há respostas para mostrar.</p>:aggregateRows.map(({device,counts})=>{const total=Object.values(counts).reduce((sum,n)=>sum+(n||0),0);return <article key={device.id} className="dashcard"><div className="dashhead"><div><span>{device.theme}</span><h3>Art. {device.article}{device.subdivision ? `, ${device.subdivision}`:''}</h3></div><b>{total} resposta(s)</b></div><div className="bars">{choices.map(choice=>{const count=counts[choice.id]||0;const pct=total?Math.round((count/total)*100):0;return <div key={choice.id} className="barrow"><div><span>{choice.label}</span><strong>{count} · {pct}%</strong></div><div className="bar"><i style={{width:`${pct}%`}}/></div></div>})}</div></article>})}</div></section>
  <section className="notice no-print"><strong>Transparência sem exposição.</strong><p>O painel público mostra somente resultados agregados. Unidade e identidade do participante não aparecem associadas às respostas.</p></section>
  <footer className="no-print"><p><strong>Torres em Comum</strong><br/>Construção participativa do Regimento Interno</p><p>Esta plataforma auxilia a organizar manifestações e não substitui a Assembleia Geral nem o canal oficial indicado pelo condomínio.</p></footer>
 </main>
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
