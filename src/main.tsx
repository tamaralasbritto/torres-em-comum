import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

type Choice = 'agree' | 'change' | 'exclude' | 'observe' | 'abstain';

const choices: {id: Choice; label: string; hint: string}[] = [
  {id:'agree',label:'Concordo',hint:'O texto pode permanecer como está.'},
  {id:'change',label:'Alterar',hint:'Quero propor uma redação diferente.'},
  {id:'exclude',label:'Excluir',hint:'Entendo que este dispositivo deve ser retirado.'},
  {id:'observe',label:'Observação',hint:'Quero registrar uma consideração sobre este ponto.'},
  {id:'abstain',label:'Não quero me manifestar a respeito',hint:'Analisei este ponto e escolho não me posicionar.'},
];

function App(){
 const [choice,setChoice]=React.useState<Choice|undefined>();
 return <main>
  <header className="top"><a className="brand" href="#">TORRES <span>EM COMUM</span></a><nav><a href="#como">Como funciona</a><a href="#consulta">Consulta</a><a href="#painel">Painel público</a></nav></header>
  <section className="hero">
   <div><p className="eyebrow">CONSTRUÇÃO PARTICIPATIVA DO REGIMENTO INTERNO</p><h1>As regras do lugar onde vivemos também podem ser construídas <em>em comum.</em></h1><p className="lead">Leia a minuta por assuntos, registre sua posição e organize suas manifestações para formalização pelos canais definidos pelo condomínio.</p><a className="primary" href="#consulta">Começar minha participação →</a></div>
   <div className="mosaic" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>
  </section>
  <section id="como" className="steps"><article><b>01</b><h2>Entenda</h2><p>Leia o texto original organizado por temas e dispositivos.</p></article><article><b>02</b><h2>Participe</h2><p>Concorde, proponha alteração ou exclusão, registre observação ou escolha não se manifestar.</p></article><article><b>03</b><h2>Formalize</h2><p>Revise suas manifestações e gere seu documento individual.</p></article></section>
  <section id="consulta" className="consult"><div className="sectionhead"><div><p className="eyebrow">DEMONSTRAÇÃO DA EXPERIÊNCIA</p><h2>Analise dispositivo por dispositivo.</h2></div><span>Texto abaixo é demonstrativo</span></div>
   <article className="device"><div className="crumb">ÁREAS COMUNS · EXEMPLO</div><h3>Art. 00 — Dispositivo demonstrativo</h3><p className="legal">O texto integral da minuta será exibido aqui, preservado como documento de referência. Nenhum resumo substituirá a redação original.</p><div className="options">{choices.map(c=><button key={c.id} className={choice===c.id?'selected':''} onClick={()=>setChoice(c.id)}><strong>{c.label}</strong><small>{c.hint}</small></button>)}</div>{(choice==='change'||choice==='exclude'||choice==='observe')&&<label className="comment">Sua manifestação<textarea placeholder="Escreva aqui. Você poderá revisar antes de formalizar."/></label>}</article>
  </section>
  <section id="painel" className="notice"><strong>Transparência sem exposição.</strong><p>O painel público mostrará somente resultados agregados. Unidade e identidade do participante não serão exibidas.</p></section>
  <footer><p><strong>Torres em Comum</strong><br/>Construção participativa do Regimento Interno</p><p>Esta plataforma não substitui a Assembleia Geral nem o canal oficial indicado pelo condomínio.</p></footer>
 </main>
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
