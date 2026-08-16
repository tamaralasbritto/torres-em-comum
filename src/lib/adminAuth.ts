const PROJECT_URL='https://hzcpbbnjoeyyfwxdsbxt.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_70vHvH0W9T3N0OCH8fTW1A_s1JkoR1q';
const SESSION_KEY='torres-em-comum:admin-session';

type AdminSession={accessToken:string;refreshToken?:string;expiresAt:number};

export function loadAdminSession():AdminSession|null{
  try{const value=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');if(!value?.accessToken)return null;return value}catch{return null}
}
export function clearAdminSession(){sessionStorage.removeItem(SESSION_KEY)}
export function consumeAdminAuthCallback():AdminSession|null{
  const params=new URLSearchParams(location.hash.replace(/^#/,''));
  const accessToken=params.get('access_token');
  if(!accessToken)return loadAdminSession();
  const expiresIn=Number(params.get('expires_in')||3600);
  const session={accessToken,refreshToken:params.get('refresh_token')||undefined,expiresAt:Date.now()+expiresIn*1000};
  sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));
  history.replaceState(null,'',`${location.pathname}${location.search}#admin`);
  return session;
}
export async function requestAdminMagicLink(email:string){
  const normalized=email.trim().toLowerCase();
  if(!normalized||!normalized.includes('@'))throw new Error('invalid_email');
  const redirect=`${location.origin}${location.pathname}#admin`;
  const response=await fetch(`${PROJECT_URL}/auth/v1/otp?redirect_to=${encodeURIComponent(redirect)}`,{
    method:'POST',headers:{'content-type':'application/json','apikey':PUBLISHABLE_KEY},body:JSON.stringify({email:normalized,create_user:true})
  });
  if(!response.ok)throw new Error('magic_link_failed');
}
async function refreshSession(session:AdminSession){
  if(!session.refreshToken)throw new Error('admin_session_expired');
  const response=await fetch(`${PROJECT_URL}/auth/v1/token?grant_type=refresh_token`,{
    method:'POST',headers:{'content-type':'application/json','apikey':PUBLISHABLE_KEY},body:JSON.stringify({refresh_token:session.refreshToken})
  });
  if(!response.ok)throw new Error('admin_session_expired');
  const data=await response.json();
  const next={accessToken:data.access_token,refreshToken:data.refresh_token||session.refreshToken,expiresAt:Date.now()+Number(data.expires_in||3600)*1000};
  sessionStorage.setItem(SESSION_KEY,JSON.stringify(next));
  return next;
}
export async function adminApi<T>(payload:Record<string,unknown>):Promise<T>{
  let session=loadAdminSession();
  if(!session)throw new Error('admin_login_required');
  if(session.expiresAt-Date.now()<60_000)session=await refreshSession(session);
  const response=await fetch(`${PROJECT_URL}/functions/v1/admin-conflicts`,{
    method:'POST',headers:{'content-type':'application/json','apikey':PUBLISHABLE_KEY,'authorization':`Bearer ${session.accessToken}`},body:JSON.stringify(payload)
  });
  let data:any={};try{data=await response.json()}catch{}
  if(response.status===401){clearAdminSession();throw new Error('admin_login_required')}
  if(!response.ok)throw new Error(data.error||`http_${response.status}`);
  return data as T;
}
