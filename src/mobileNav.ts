function setupMobileNav(){
  const header=document.querySelector<HTMLElement>('.appTop');
  const nav=header?.querySelector<HTMLElement>('.tabs');
  if(!header||!nav||document.getElementById('mobileNavToggle'))return;

  const toggle=document.createElement('button');
  toggle.id='mobileNavToggle';
  toggle.type='button';
  toggle.className='mobileNavToggle';
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-controls','mobilePrimaryNav');
  toggle.innerHTML='<span aria-hidden="true">☰</span><span>Menu</span>';
  nav.id='mobilePrimaryNav';

  const close=()=>{
    header.classList.remove('mobile-nav-open');
    toggle.setAttribute('aria-expanded','false');
  };
  const open=()=>{
    header.classList.add('mobile-nav-open');
    toggle.setAttribute('aria-expanded','true');
  };

  toggle.addEventListener('click',()=>header.classList.contains('mobile-nav-open')?close():open());
  nav.addEventListener('click',event=>{
    const button=(event.target as HTMLElement).closest('button');
    if(button)close();
  });
  header.querySelector('.brandButton')?.addEventListener('click',close);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')close()});
  window.addEventListener('resize',()=>{if(window.innerWidth>760)close()});

  [...nav.querySelectorAll('button')].forEach(button=>{
    if(button.textContent?.trim()==='Meu resumo')button.classList.add('mobileSummaryLink');
  });

  header.insertBefore(toggle,nav);
}

const observer=new MutationObserver(setupMobileNav);
observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('load',setupMobileNav);
setupMobileNav();
