import React from 'react';
import { adminApi, clearAdminSession, consumeAdminAuthCallback, loadAdminSession, requestAdminMagicLink } from './lib/adminAuth';

type Conflict={tower:string;apartment:string;claimant_count:number;oldest_conflict_at:string};
type Claimant={participant_id:string;name:string;role:'owner'|'tenant';protocol_id:string;finalized_at:string;conflict_at:string};

export function AdminPanel(){
  const [sessionReady,setSessionReady]=React.useState(false);
  const [logged,setLogged]=React.useState(false);
  const [email,setEmail]=React.useState('');
  const [message,setMessage]=React.useState('');
  const [conflicts,setConflicts]=React.useState<Conflict[]>([]);
  const [selected,setSelected]=React.useState<{tower:string;apartment:string;claimants:Claimant[]}|null>(null);
  const [note,setNote]=React.useState('');
  const [busy,setBusy]=React.useState(false);

  const loadConflicts=React.useCallback(async()=>{
    setBusy(true);
    try{const data=await adminApi<any>({action:'list'});setConflicts(data.conflicts||[]);setLogged(true);setMessage('')}
    catch(e){setLogged(false);setMessage(String((e as Error).message)==='validator_not_authorized'?'Este usuário não está autorizado a validar conflitos.':'Sua sessão administrativa precisa ser renovada.')}
    finally{setBusy(false)}
  },[]);

  React.useEffect(()=>{
    const session=consumeAdminAuthCallback();
    setSessionReady(true);
    if(session||loadAdminSession())loadConflicts();
  },[loadConflicts]);

  const sendLink=async()=>{
    setBusy(true);setMessage('');
    try{await requestAdminMagicLink(email);setMessage('Link de acesso enviado. Abra o e-mail neste navegador para entrar no painel.')}
    catch{setMessage('Não foi possível enviar o link agora.')}
    finally{setBusy(false)}
  };
  const openConflict=async(c:Conflict)=>{
    setBusy(true);
    try{const data=await adminApi<any>({action:'view',tower:c.tower,apartment:c.apartment});setSelected({tower:c.tower,apartment:c.apartment,claimants:data.claimants||[]});setNote('')}
    catch{setMessage('Não foi possível abrir esse conflito.')}
    finally{setBusy(false)}
  };
  const resolve=async(winnerId:string)=>{
    if(note.trim().length<3){setMessage('Registre uma justificativa curta para a decisão.');return}
    if(!window.confirm('Confirmar esta pessoa como responsável válido da unidade? A outra manifestação permanecerá no histórico como substituída.'))return;
    setBusy(true);
    try{await adminApi({action:'resolve',winnerId,note:note.trim()});setSelected(null);setMessage('Conflito resolvido e registrado na auditoria.');await loadConflicts()}
    catch{setMessage('Não foi possível concluir a validação.')}
    finally{setBusy(false)}
  };
  const logout=()=>{clearAdminSession();setLogged(false);setSelected(null);setConflicts([])};

  if(!sessionReady)return <main className="adminpage"><p>Carregando acesso seguro…</p></main>;
  if(!logged)return <main className="adminpage"><section className="adminlogin"><p className="eyebrow">ÁREA RESTRITA</p><h1>Validação de conflitos</h1><p>O acesso é liberado somente para endereços previamente autorizados. Não há senha compartilhada.</p><label>E-mail autorizado<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu e-mail"/></label><button className="primary" disabled={busy} onClick={sendLink}>{busy?'Enviando…':'Receber link de acesso →'}</button>{message&&<p className="adminmessage">{message}</p>}<a className="backlink" href="/">← Voltar para a consulta</a></section></main>;

  return <main className="adminpage"><header className="admintop"><div><p className="eyebrow">ÁREA RESTRITA</p><h1>Conflitos de unidade</h1></div><div><button onClick={loadConflicts}>Atualizar</button><button onClick={logout}>Sair</button></div></header><section className="adminnotice"><strong>Decisão sem viés de voto</strong><p>Este painel mostra somente os dados necessários para verificar legitimidade. As escolhas e comentários de cada manifestação não são exibidos aqui.</p></section>{message&&<p className="adminmessage">{message}</p>}{selected?<section className="conflictbox"><button className="backlink" onClick={()=>setSelected(null)}>← Voltar aos conflitos</button><h2>Torre {selected.tower} · Apto. {selected.apartment}</h2><p>Compare apenas a identidade declarada e a evidência externa disponível. A decisão exige justificativa e fica registrada.</p><div className="claimants">{selected.claimants.map(c=><article key={c.participant_id}><span>{c.role==='owner'?'Proprietário(a) declarado(a)':'Inquilino(a) declarado(a)'}</span><h3>{c.name}</h3><p>Protocolo: <code>{c.protocol_id}</code></p><p>Finalizado em {new Date(c.finalized_at).toLocaleString('pt-BR')}</p><button disabled={busy} onClick={()=>resolve(c.participant_id)}>Validar esta manifestação</button></article>)}</div><label className="resolutionnote">Justificativa da validação<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Ex.: titularidade confirmada pela administração em documento apresentado."/><small>Não registre CPF, número de documento ou outros dados desnecessários.</small></label></section>:<section className="conflictlist"><div className="sectionhead"><div><p className="eyebrow">PENDÊNCIAS</p><h2>{conflicts.length} unidade(s) aguardando validação</h2></div></div>{conflicts.length===0?<p className="empty">Nenhum conflito pendente.</p>:conflicts.map(c=><button key={`${c.tower}-${c.apartment}`} className="conflictrow" onClick={()=>openConflict(c)}><strong>Torre {c.tower} · Apto. {c.apartment}</strong><span>{c.claimant_count} manifestações conflitantes</span><span>Desde {new Date(c.oldest_conflict_at).toLocaleString('pt-BR')}</span><b>Abrir →</b></button>)}</section>}</main>;
}
