import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import './validator.css';

const BASE='https://hzcpbbnjoeyyfwxdsbxt.supabase.co';
const KEY='sb_publishable_70vHvH0W9T3N0OCH8fTW1A_s1JkoR1q';
const SESSION_KEY='torres-em-comum:validator-session';

type Slot={slot:number;role:'principal'|'reviewer';displayName:string|null};
type Conflict={tower:string;apartment:string;claimants:number;conflict_at:string;reviews:number};
type Claimant={id:string;protocol_id:string;name:string;role:'owner'|'tenant';finalized_at:string;conflict_at:string};
type Review={id:string;reviewer_name:string|null;slot_no:number;recommendation:'claimant_a'|'claimant_b'|'insufficient_evidence';claimant_a_id:string;claimant_b_id:string;note:string;created_at:string};
type ConflictDetail={tower:string;apartment:string;claimants:Claimant[];reviews:Review[]};

async function api(path:string,body:unknown,token?:string){
 const res=await fetch(`${BASE}${path}`,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
 const data=await res.json().catch(()=>({error:'invalid_response'}));
 if(!res.ok) throw new Error(data.error||`http_${res.status}`);
 return data;
}

const roleLabel=(role:string)=>role==='owner'?'Proprietário(a)':'Inquilino(a)';
const recLabel=(r:string)=>r==='claimant_a'?'Primeira manifestação':r==='claimant_b'?'Segunda manifestação':'Evidência insuficiente';

function App(){
 const [email,setEmail]=React.useState('');
 const [otp,setOtp]=React.useState('');
 const [phase,setPhase]=React.useState<'email'|'otp'|'app'>(()=>sessionStorage.getItem(SESSION_KEY)?'app':'email');
 const [token,setToken]=React.useState(()=>sessionStorage.getItem(SESSION_KEY)||'');
 const [slot,setSlot]=React.useState<Slot|null>(null);
 const [conflicts,setConflicts]=React.useState<Conflict[]>([]);
 const [selected,setSelected]=React.useState<ConflictDetail|null>(null);
 const [note,setNote]=React.useState('');
 const [recommendation,setRecommendation]=React.useState<'claimant_a'|'claimant_b'|'insufficient_evidence'>('insufficient_evidence');
 const [busy,setBusy]=React.useState(false);
 const [message,setMessage]=React.useState('');

 const validator=React.useCallback((body:unknown)=>api('/functions/v1/validator',body,token),[token]);
 const load=React.useCallback(async()=>{
   const me=await validator({action:'me'}); setSlot(me);
   const list=await validator({action:'list_conflicts'}); setConflicts(list.conflicts||[]);
 },[validator]);
 React.useEffect(()=>{if(phase==='app'&&token)load().catch(()=>{sessionStorage.removeItem(SESSION_KEY);setToken('');setPhase('email')})},[phase,token,load]);

 async function requestOtp(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage('');try{await api('/auth/v1/otp',{email,create_user:false});setPhase('otp');setMessage('Código enviado para o e-mail autorizado.')}catch(err){setMessage((err as Error).message)}finally{setBusy(false)}}
 async function verifyOtp(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage('');try{const data=await api('/auth/v1/verify',{type:'email',email,token:otp});const access=data.access_token;if(!access)throw new Error('login_failed');sessionStorage.setItem(SESSION_KEY,access);setToken(access);setPhase('app')}catch(err){setMessage((err as Error).message)}finally{setBusy(false)}}
 async function openConflict(c:Conflict){setBusy(true);setMessage('');try{const d=await validator({action:'get_conflict',tower:c.tower,apartment:c.apartment});setSelected(d);setNote('');setRecommendation('insufficient_evidence')}catch(err){setMessage((err as Error).message)}finally{setBusy(false)}}
 async function submitReview(){if(!selected||selected.claimants.length<2)return;setBusy(true);try{await validator({action:'submit_review',tower:selected.tower,apartment:selected.apartment,claimantA:selected.claimants[0].id,claimantB:selected.claimants[1].id,recommendation,note});setSelected(await validator({action:'get_conflict',tower:selected.tower,apartment:selected.apartment}));setMessage('Análise registrada.')}catch(err){setMessage((err as Error).message)}finally{setBusy(false)}}
 async function resolve(winner:Claimant){if(!selected)return;setBusy(true);try{await validator({action:'resolve',winnerParticipantId:winner.id,note});setSelected(null);setMessage('Conflito resolvido e registrado na auditoria.');await load()}catch(err){setMessage((err as Error).message)}finally{setBusy(false)}}
 function logout(){sessionStorage.removeItem(SESSION_KEY);setToken('');setSlot(null);setSelected(null);setPhase('email')}

 if(phase==='email')return <main className="validator-shell"><section className="validator-login"><p className="eyebrow">ÁREA RESTRITA</p><h1>Validação de conflitos</h1><p>Somente contas previamente autorizadas conseguem acessar dados identificáveis desta área.</p><form onSubmit={requestOtp}><label>E-mail autorizado<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label><button disabled={busy}>Enviar código de acesso</button></form>{message&&<p className="validator-message">{message}</p>}</section></main>;
 if(phase==='otp')return <main className="validator-shell"><section className="validator-login"><p className="eyebrow">VERIFICAÇÃO</p><h1>Digite o código recebido</h1><form onSubmit={verifyOtp}><label>Código<input inputMode="numeric" required value={otp} onChange={e=>setOtp(e.target.value)} autoComplete="one-time-code"/></label><button disabled={busy}>Entrar</button></form><button className="linkbutton" onClick={()=>setPhase('email')}>Usar outro e-mail</button>{message&&<p className="validator-message">{message}</p>}</section></main>;

 return <main className="validator-shell"><header className="validator-top"><div><p className="eyebrow">TORRES EM COMUM</p><h1>Fila de validação</h1><p>{slot?.role==='principal'?'Validadora principal':'Revisor(a)'}{slot?.displayName?` · ${slot.displayName}`:''}</p></div><button onClick={logout}>Sair</button></header>{message&&<p className="validator-message">{message}</p>}
 {!selected?<section className="validator-list">{conflicts.length===0?<div className="validator-empty"><h2>Nenhum conflito pendente.</h2><p>Quando duas manifestações disputarem a mesma unidade, elas aparecerão aqui.</p></div>:conflicts.map(c=><button key={`${c.tower}-${c.apartment}`} className="conflict-row" onClick={()=>openConflict(c)}><div><strong>Torre {c.tower} · Apto. {c.apartment}</strong><span>{c.claimants} manifestações concorrentes</span></div><div><span>{c.reviews} análise(s)</span><b>Revisar →</b></div></button>)}</section>:
 <section className="conflict-detail"><button className="linkbutton" onClick={()=>setSelected(null)}>← Voltar à fila</button><div className="sectionhead"><div><p className="eyebrow">CONFLITO DE LEGITIMIDADE</p><h2>Torre {selected.tower} · Apto. {selected.apartment}</h2></div><span>{selected.reviews.length} análise(s)</span></div><p className="data-warning">Esta tela contém dados pessoais mínimos necessários à validação. O acesso fica registrado em auditoria. Não copie nem compartilhe essas informações fora desta finalidade.</p><div className="claimants">{selected.claimants.slice(0,2).map((c,i)=><article key={c.id}><span>Manifestação {i===0?'A':'B'}</span><h3>{c.name}</h3><p>{roleLabel(c.role)}</p><small>Protocolo: {c.protocol_id}</small><small>Finalizada em: {new Date(c.finalized_at).toLocaleString('pt-BR')}</small>{slot?.role==='principal'&&<button disabled={busy||note.trim().length<3} onClick={()=>resolve(c)}>Validar esta manifestação</button>}</article>)}</div><div className="reviewbox"><h3>{slot?.role==='principal'?'Registrar análise antes da decisão':'Registrar recomendação'}</h3><label>Conclusão<select value={recommendation} onChange={e=>setRecommendation(e.target.value as any)}><option value="claimant_a">Manifestação A parece legítima</option><option value="claimant_b">Manifestação B parece legítima</option><option value="insufficient_evidence">Evidência insuficiente</option></select></label><label>Justificativa<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={2000} placeholder="Registre apenas a evidência necessária para justificar sua conclusão. Não inclua dados pessoais que não sejam necessários."/></label><button disabled={busy||note.trim().length<3} onClick={submitReview}>Registrar análise</button></div>{selected.reviews.length>0&&<div className="review-history"><h3>Análises registradas</h3>{selected.reviews.map(r=><article key={r.id}><strong>Slot {r.slot_no}{r.reviewer_name?` · ${r.reviewer_name}`:''}</strong><span>{recLabel(r.recommendation)}</span><p>{r.note}</p><small>{new Date(r.created_at).toLocaleString('pt-BR')}</small></article>)}</div>}</section>}
 </main>
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
