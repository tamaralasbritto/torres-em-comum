const SITE_KEY='0x4AAAAAAEWHW6qFBwob9995';
const SCRIPT_URL='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

type TurnstileApi={
  render:(container:HTMLElement,options:Record<string,unknown>)=>string;
  remove:(widgetId:string)=>void;
};

declare global{
  interface Window{turnstile?:TurnstileApi}
}

let apiPromise:Promise<TurnstileApi>|null=null;

function loadTurnstile():Promise<TurnstileApi>{
  if(window.turnstile)return Promise.resolve(window.turnstile);
  if(apiPromise)return apiPromise;

  apiPromise=new Promise<TurnstileApi>((resolve,reject)=>{
    const finish=()=>{
      if(window.turnstile)resolve(window.turnstile);
      else{apiPromise=null;reject(new Error('turnstile_unavailable'))}
    };
    const fail=()=>{apiPromise=null;reject(new Error('turnstile_script_failed'))};
    const existing=document.querySelector<HTMLScriptElement>('script[data-turnstile-api="1"]');
    if(existing){
      existing.addEventListener('load',finish,{once:true});
      existing.addEventListener('error',fail,{once:true});
      window.setTimeout(()=>{if(window.turnstile)finish()},0);
      return;
    }
    const script=document.createElement('script');
    script.src=SCRIPT_URL;
    script.async=true;
    script.defer=true;
    script.dataset.turnstileApi='1';
    script.addEventListener('load',finish,{once:true});
    script.addEventListener('error',fail,{once:true});
    document.head.appendChild(script);
  });

  return apiPromise;
}

function createChallengeShell(){
  const overlay=document.createElement('div');
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-label','Verificação de segurança');
  overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:20px;background:rgba(20,20,16,.58)';

  const card=document.createElement('div');
  card.style.cssText='width:min(390px,100%);background:#fffdf4;border:1px solid #171713;padding:22px;box-shadow:0 18px 60px rgba(0,0,0,.25);font-family:Arial,Helvetica,sans-serif;color:#171713';
  const title=document.createElement('strong');
  title.textContent='Verificação de segurança';
  title.style.cssText='display:block;margin-bottom:8px;font-size:17px';
  const text=document.createElement('p');
  text.textContent='Só um instante. Esta verificação ajuda a impedir envios automáticos.';
  text.style.cssText='margin:0 0 16px;line-height:1.45;font-size:14px';
  const target=document.createElement('div');
  target.style.cssText='min-height:65px;display:grid;place-items:center';
  card.append(title,text,target);
  overlay.appendChild(card);
  return{overlay,target};
}

export async function getTurnstileToken():Promise<string>{
  const api=await loadTurnstile();
  return new Promise<string>((resolve,reject)=>{
    const{overlay,target}=createChallengeShell();
    let widgetId:string|undefined;
    let settled=false;
    let timer=0;

    const cleanup=()=>{
      if(timer)window.clearTimeout(timer);
      if(widgetId){try{api.remove(widgetId)}catch{}}
      overlay.remove();
    };
    const succeed=(token:string)=>{
      if(settled)return;
      settled=true;
      cleanup();
      resolve(token);
    };
    const fail=(code:string)=>{
      if(settled)return;
      settled=true;
      cleanup();
      reject(new Error(code));
    };

    document.body.appendChild(overlay);
    try{
      widgetId=api.render(target,{
        sitekey:SITE_KEY,
        action:'start_participation',
        theme:'auto',
        size:'normal',
        appearance:'always',
        callback:(token:string)=>succeed(token),
        'error-callback':()=>fail('human_verification_failed'),
        'timeout-callback':()=>fail('human_verification_timeout'),
      });
      timer=window.setTimeout(()=>fail('human_verification_timeout'),120000);
    }catch{
      fail('human_verification_failed');
    }
  });
}
