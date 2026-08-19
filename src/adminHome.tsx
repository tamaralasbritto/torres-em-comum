import React from 'react';
import { adminApi, clearAdminSession, consumeAdminAuthCallback, loadAdminSession, requestAdminMagicLink } from './lib/adminAuth';

type ValidatorInfo={slotNo:number;role:'principal'|'reviewer';status:string;displayName?:string|null};

export function AdminHome(){
  const [ready,setReady]=React.useState(false);
  const [logged,setLogged]=React.useState(false);
  const [email,setEmail]=React.useState('');
  const [message,setMessage]=React.useState('');
  const [validator,setValidator]=React.useState<ValidatorInfo|null>(null);
  const [busy,setBusy]=React.useState(false);

  const bootstrap=React.useCallback(async()=>{
    setBusy(true);
    try{
      const data=await adminApi<{validator:ValidatorInfo}>({action:'bootstrap'},'admin');
      if(data.validator?.role!=='principal')throw new Error('principal_required');
      setValidator(data.validator);setLogged(true);setMessage('');
    }catch(e){
      setLogged(false);
      const code=String((e as Error).message||'');
      setMessage(code==='principal_required'||code==='validator_not_authorized'?'Este acesso é exclusivo do administrador principal.':'Sua sessão administrativa precisa ser renovada.');
    }finally{setBusy(false)}
  },[]);

  React.useEffect(()=>{
    const session=consumeAdminAuthCallback('admin');
    setReady(true);
    if(session||loadAdminSession('admin'))bootstrap();
  },[bootstrap]);

  const sendLink=async()=>{
    setBusy(true);setMessage('');
    try{await requestAdminMagicLink(email,'admin');setMessage('Se este e-mail estiver autorizado como administrador principal, o link de acesso será enviado.')}
    catch{setMessage('Não foi possível solicitar o link agora.')}
    finally{setBusy(false)}
  };
  const logout=()=>{clearAdminSession('admin');setLogged(false);setValidator(null)};

  if(!ready)return <main className="adminpage"><p>Carregando acesso seguro…</p></main>;
  if(!logged)return <main className="adminpage"><section className="adminlogin"><p className="eyebrow">ADMINISTRAÇÃO</p><h1>Painel administrativo</h1><p>Área exclusiva do administrador principal. O validador de conflitos possui acesso separado e não entra aqui.</p><label>E-mail autorizado<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu e-mail"/></label><button className="primary" disabled={busy} onClick={sendLink}>{busy?'Enviando…':'Receber link de acesso →'}</button>{message&&<p className="adminmessage">{message}</p>}<a className="backlink" href="/">← Voltar para a consulta</a></section></main>;

  return <main className="adminpage"><header className="admintop"><div><p className="eyebrow">ADMINISTRAÇÃO</p><h1>Painel administrativo</h1></div><button onClick={logout}>Sair</button></header><section className="adminnotice"><strong>Acesso principal ativo</strong><p>{validator?.displayName||'Administrador principal'} · sessão protegida e separada da validação de conflitos.</p></section><section className="conflictlist"><div className="sectionhead"><div><p className="eyebrow">ATALHOS</p><h2>Operação da consulta</h2></div></div><a className="conflictrow" href="/"><strong>Consulta pública</strong><span>Visualizar a experiência dos moradores</span><b>Abrir →</b></a><a className="conflictrow" href="/?validator=1"><strong>Validador de conflitos</strong><span>Área separada para legitimidade de unidade</span><b>Abrir →</b></a><a className="conflictrow" href="/#glossario"><strong>Glossário</strong><span>Revisar definições da minuta</span><b>Abrir →</b></a></section></main>;
}
