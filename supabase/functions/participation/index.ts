import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import postgres from 'npm:postgres@3.4.5'

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 1 })

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
}
const CHOICES = new Set(['agree','change','exclude','observe','abstain'])
const ROLES = new Set(['owner','tenant'])
const TOWERS = new Set(['A','B','C','D'])
const MAX_BODY_BYTES = 1_000_000
const MAX_COMMENT = 5_000
const PUBLIC_K = 5

function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: CORS }) }
function error(code: string, status = 400) { return json({ error: code }, status) }
function validApartment(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{3}$/.test(value)) return false
  const floor = Number(value[0]); const unit = Number(value.slice(1))
  return floor >= 0 && floor <= 9 && unit >= 1 && unit <= 10
}
function validUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
function base64url(bytes: Uint8Array) {
  let binary=''; for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')
}
async function sha256Hex(text: string) {
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')
}
function validateResponses(value: unknown) {
  if (!Array.isArray(value) || value.length > 800) throw new Error('invalid_responses')
  const ids=new Set<string>()
  return value.map((raw:any)=>{
    const deviceId=raw?.device_id; const choice=raw?.choice
    const comment=typeof raw?.comment==='string'?raw.comment.trim():''
    if(typeof deviceId!=='string'||!/^art-[a-z0-9-]+$/.test(deviceId)) throw new Error('invalid_device_id')
    if(ids.has(deviceId)) throw new Error('duplicate_device_id'); ids.add(deviceId)
    if(!CHOICES.has(choice)) throw new Error('invalid_choice')
    if(comment.length>MAX_COMMENT) throw new Error('comment_too_long')
    return {device_id:deviceId,choice,comment:comment||null}
  })
}

async function createDraft(body:any){
  const name=typeof body.name==='string'?body.name.trim().replace(/\s+/g,' '):''
  const tower=typeof body.tower==='string'?body.tower.toUpperCase():''
  const apartment=body.apartment; const role=body.role
  if(name.length<3||name.length>160)return error('invalid_name')
  if(!TOWERS.has(tower))return error('invalid_tower')
  if(!validApartment(apartment))return error('invalid_apartment')
  if(!ROLES.has(role))return error('invalid_role')
  if(role==='tenant'){
    const owner=await sql`select 1 from private.participants where tower=${tower} and apartment=${apartment} and role='owner' and status='finalized' limit 1`
    if(owner.length)return error('owner_already_finalized',409)
  }
  const tokenBytes=crypto.getRandomValues(new Uint8Array(32)); const resumeToken=base64url(tokenBytes)
  const tokenHash=await sha256Hex(resumeToken)
  const [p]=await sql`insert into private.participants(name,tower,apartment,role,status,resume_token_hash)
    values(${name},${tower},${apartment},${role}::public.resident_role,'draft',${tokenHash})
    returning id,protocol_id,created_at,last_saved_at`
  await sql`insert into private.audit_events(participant_id,protocol_id,event_type,metadata)
    values(${p.id},${p.protocol_id},'draft_created',jsonb_build_object('role',${role}))`
  return json({participantId:p.id,protocolId:p.protocol_id,resumeToken,status:'draft',createdAt:p.created_at,lastSavedAt:p.last_saved_at})
}
async function authenticatedDraft(body:any){
  if(!validUuid(body.participantId)||typeof body.resumeToken!=='string'||body.resumeToken.length<32)throw new Error('invalid_resume_credentials')
  const tokenHash=await sha256Hex(body.resumeToken)
  const rows=await sql`select id,name,tower,apartment,role,status,protocol_id,created_at,last_saved_at,finalized_at,payload_hash
    from private.participants where id=${body.participantId} and resume_token_hash=${tokenHash} limit 1`
  if(!rows.length)throw new Error('invalid_resume_credentials')
  return {participant:rows[0],tokenHash}
}
async function resumeDraft(body:any){
  const {participant}=await authenticatedDraft(body)
  if(participant.status!=='draft')return error('draft_not_editable',409)
  const responses=await sql`select device_id,choice,comment from private.responses where participant_id=${participant.id} order by device_id`
  return json({participant:{id:participant.id,name:participant.name,tower:participant.tower,apartment:participant.apartment,role:participant.role,status:participant.status,protocolId:participant.protocol_id,createdAt:participant.created_at,lastSavedAt:participant.last_saved_at},responses})
}
async function saveDraft(body:any){
  const {participant,tokenHash}=await authenticatedDraft(body)
  if(participant.status!=='draft')return error('draft_not_editable',409)
  const responses=validateResponses(body.responses)
  const [saved]=await sql`select private.save_draft(${participant.id}::uuid,${tokenHash},${sql.json(responses)}::jsonb) as saved_at`
  return json({status:'draft',lastSavedAt:saved.saved_at})
}
async function finalize(body:any){
  const {participant,tokenHash}=await authenticatedDraft(body)
  if(participant.status!=='draft')return error('participation_not_draft',409)
  if(body.responses!==undefined){const responses=validateResponses(body.responses);await sql`select private.save_draft(${participant.id}::uuid,${tokenHash},${sql.json(responses)}::jsonb)`}
  try{
    const [r]=await sql`select * from private.finalize_participation(${participant.id}::uuid,${tokenHash})`
    return json({protocolId:r.protocol_id,status:r.status,finalizedAt:r.finalized_at,payloadHash:r.payload_hash})
  }catch(e){const msg=String((e as Error).message||e);if(msg.includes('owner_already_finalized'))return error('owner_already_finalized',409);if(msg.includes('empty_manifestation'))return error('empty_manifestation');throw e}
}
async function publicPanel(){
  const rows=await sql`select r.device_id,r.choice,count(*)::int as count from private.responses r join private.participants p on p.id=r.participant_id where p.status='finalized' group by r.device_id,r.choice order by r.device_id,r.choice`
  const grouped=new Map<string,Record<string,number>>()
  for(const row of rows){const counts=grouped.get(row.device_id)||{};counts[row.choice]=Number(row.count);grouped.set(row.device_id,counts)}
  const devices:any[]=[]
  for(const [deviceId,counts] of grouped){
    const values=Object.values(counts);const total=values.reduce((a,b)=>a+b,0);if(total<PUBLIC_K)continue
    const hasSmallCell=values.some(n=>n>0&&n<PUBLIC_K)
    if(hasSmallCell){const publicCounts:Record<string,number|string>={};for(const choice of CHOICES){const n=counts[choice]||0;publicCounts[choice]=n>=PUBLIC_K?n:n>0?'<5':0}devices.push({deviceId,responses:'5+',counts:publicCounts,percentages:null,suppressed:true})}
    else{const publicCounts:Record<string,number>={};const percentages:Record<string,number>={};for(const choice of CHOICES){const n=counts[choice]||0;publicCounts[choice]=n;percentages[choice]=total?Math.round((n/total)*1000)/10:0}devices.push({deviceId,responses:total,counts:publicCounts,percentages,suppressed:false})}
  }
  const [unitRow]=await sql`select count(*)::int as n from private.participants where status='finalized'`;const units=Number(unitRow?.n||0)
  return json({k:PUBLIC_K,participatingUnits:units>=PUBLIC_K?units:null,devices})
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:CORS})
  if(req.method!=='POST')return error('method_not_allowed',405)
  try{
    const text=await req.text();if(new TextEncoder().encode(text).byteLength>MAX_BODY_BYTES)return error('payload_too_large',413)
    let body:any;try{body=JSON.parse(text||'{}')}catch{return error('invalid_json')}
    switch(body.action){case'create':return await createDraft(body);case'resume':return await resumeDraft(body);case'save':return await saveDraft(body);case'finalize':return await finalize(body);case'panel':return await publicPanel();default:return error('invalid_action')}
  }catch(e){const message=String((e as Error)?.message||e);const safe=['invalid_resume_credentials','invalid_responses','invalid_device_id','duplicate_device_id','invalid_choice','comment_too_long'];const code=safe.find(c=>message.includes(c));if(code)return error(code,code==='invalid_resume_credentials'?401:400);console.error('participation function error',{type:(e as any)?.name||'Error',code:(e as any)?.code||null});return error('internal_error',500)}
})
