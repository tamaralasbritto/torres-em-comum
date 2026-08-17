import React from 'react';
import { glossaryDevices } from './data/topics';

export function Glossary(){
  return <main>
    <header className="top"><a className="brand" href="#">TORRES <span>EM COMUM</span></a><nav><a href="#">Voltar à consulta</a></nav></header>
    <section className="consult" style={{paddingTop:70}}>
      <div className="sectionhead"><div><p className="eyebrow">GLOSSÁRIO DA MINUTA</p><h2>Termos usados no Regimento</h2></div><span>{glossaryDevices.length} definições</span></div>
      <p className="dashboardintro">Estes dispositivos foram separados da votação porque funcionam como definições de nomenclatura. Eles continuam disponíveis para consulta e não entram na contagem de decisões.</p>
      <div className="reviewlist">
        {glossaryDevices.map(d=><article key={d.id}>
          <span>Art. {d.article}{d.subdivision?`, ${d.subdivision}`:''}</span>
          <p className="legal">{d.text}</p>
          {d.plainLanguage&&<details><summary><strong>O que isso quer dizer?</strong></summary><p>{d.plainLanguage}</p></details>}
          {d.translationNote&&<aside><strong>Ponto de atenção na redação:</strong> {d.translationNote}</aside>}
        </article>)}
      </div>
    </section>
  </main>
}
