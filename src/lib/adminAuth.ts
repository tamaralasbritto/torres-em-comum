const PROJECT_URL='https://hzcpbbnjoeyyfwxdsbxt.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_70vHvH0W9T3N0OCH8fTW1A_s1JkoR1q';

export type SecureArea='admin'|'validator';
type AdminSession={accessToken:string;refreshToken?:string;expiresAt:number};
const sessionKey=(area:SecureArea)=>`torres-em-comum:${area}-session`;

export function loadAdminSession(area:SecureArea='validator'):AdminSession|null{
  try{const value=JSON.parse(sessionStorage.getItem(sessionKey(area))||'null');if(!value?.accessToken)return null;return value}catch{return null}
}
export function clearAdminSession(area:SecureArea='validator'){sessionStorage.removeItem(sessionKey(area))}
export function consumeAdminAuthCallback(area:SecureArea='validator'):AdminSession|null{
  const params=new URLSearchParams(location.hash.replace(/^#/,''));
  const accessToken=params.get('access_token');
  if(!accessToken)return loadAdminSession(area);
  const expiresIn=Number(params.get('expires_in')||3600);
  const session={accessToken,refreshToken:params.get('refresh_token')||undefined,expiresAt:Date.now()+expiresIn*1000};
  sessionStorage.setItem(sessionKey(area),JSON.stringify(session));
  history.replaceState(null,'',`${location.pathname}${location.search}`);
  return session;
}
export async function requestAdminMagicLink(email:string,area:SecureArea='validator'){
  const normalized=email.trim().toLowerCase();
  if(!normalized||!normalized.includes('@'))throw new Error('invalid_email');
  const response=await fetch(`${PROJECT_URL}/functions/v1/validator-auth`,{
    method:'POST',headers:{'content-type':'application/json','apikey':PUBLISHABLE_KEY},body:JSON.stringify({email:normalized,area})
  });
  if(!response.ok)throw new Error('magic_link_failed');
}
async function refreshSession(session:AdminSession,area:SecureArea){
  if(!session.refreshToken)throw new Error('admin_session_expired');
  const response=await fetch(`${PROJECT_URL}/auth/v1/token?grant_type=refresh_token`,{
    method:'POST',headers:{'content-type':'application/json','apikey':PUBLISHABLE_KEY},body:JSON.stringify({refresh_token:session.refreshToken})
  });
  if(!response.ok)throw new Error('admin_session_expired');
  const data=await response.json();
  const next={accessToken:data.access_token,refreshToken:data.refresh_token||session.refreshToken,expiresAt:Date.now()+Number(data.expires_in||3600)*1000};
  sessionStorage.setItem(sessionKey(area),JSON.stringify(next));
  return next;
}
export async function adminApi<T>(payload:Record<string,unknown>,area:SecureArea='validator'):Promise<T>{
  let session=loadAdminSession(area);
  if(!session)throw new Error('admin_login_required');
  if(session.expiresAt-Date.now()<60_000)session=await refreshSession(session,area);
  const response=await fetch(`${PROJECT_URL}/functions/v1/admin-conflicts`,{
    method:'POST',headers:{'content-type':'application/json','apikey':PUBLISHABLE_KEY,'authorization':`Bearer ${session.accessToken}`},body:JSON.stringify(payload)
  });
  let data:any={};try{data=await response.json()}catch{}
  if(response.status===401){clearAdminSession(area);throw new Error('admin_login_required')}
  if(!response.ok)throw new Error(data.error||`http_${response.status}`);
  return data as T;
}
