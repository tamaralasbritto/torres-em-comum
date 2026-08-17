import { devices, type Device } from './index';

export type DecisionTopic = {
  id:string;
  category:string;
  title:string;
  summary:string;
  deviceIds:string[];
};

const isGlossary=(d:Device)=>d.theme==='Definições';
export const glossaryDevices=devices.filter(isGlossary);
const votableDevices=devices.filter(d=>!isGlossary(d));
const byRange=(from:number,to:number,filter?:(d:Device)=>boolean)=>votableDevices.filter(d=>d.article>=from&&d.article<=to&&(!filter||filter(d))).map(d=>d.id);
const byTheme=(theme:string)=>votableDevices.filter(d=>d.theme===theme).map(d=>d.id);
const merge=(...parts:string[][])=>[...new Set(parts.flat())];

export const decisionTopics:DecisionTopic[]=[
  {id:'regencia',category:'Regras gerais',title:'Quais normas regem o condomínio',summary:'Define quais leis, documentos internos e decisões de assembleia devem ser observados no condomínio.',deviceIds:byRange(1,1)},
  {id:'finalidade-regimento',category:'Regras gerais',title:'Finalidade do Regimento Interno',summary:'Define o objetivo declarado do Regimento e os valores que orientam suas regras de convivência.',deviceIds:byRange(2,2)},
  {id:'direitos',category:'Regras gerais',title:'Direitos dos moradores e proprietários',summary:'Reúne os direitos de usar a unidade e as áreas comuns, participar de assembleias, consultar documentos e questionar a administração.',deviceIds:byRange(4,5)},
  {id:'deveres',category:'Regras gerais',title:'Deveres dos moradores e proprietários',summary:'Trata de obrigações como comunicar mudanças de titularidade, manter dados atualizados, contribuir com despesas e permitir acessos indispensáveis.',deviceIds:byRange(6,6)},
  {id:'proibicoes-gerais',category:'Regras gerais',title:'Proibições gerais de uso e convivência',summary:'Agrupa restrições sobre uso não residencial, fachada, objetos em corredores, segurança, funcionários e recursos coletivos.',deviceIds:byRange(7,7)},
  {id:'assembleias-convocacao',category:'Administração',title:'Convocação e participação em assembleias',summary:'Define quem convoca, como os moradores são avisados, prazos, presença, representação e participação nas assembleias.',deviceIds:byRange(8,12)},
  {id:'assembleias-decisao',category:'Administração',title:'Votação, decisões e atas de assembleias',summary:'Reúne regras sobre votação, quórum, registro das decisões, atas e efeitos das deliberações.',deviceIds:byRange(13,18)},
  {id:'sindico-eleicao',category:'Administração',title:'Eleição, mandato e substituição do síndico',summary:'Trata de candidatura, mandato, remuneração, destituição e substituição do síndico.',deviceIds:byRange(19,21)},
  {id:'sindico-poderes',category:'Administração',title:'Poderes e responsabilidades do síndico',summary:'Reúne as atribuições administrativas, financeiras, de manutenção, cobrança, prestação de contas e execução das decisões coletivas.',deviceIds:byRange(22,24)},
  {id:'sub-conselho',category:'Administração',title:'Subsíndico e Conselho',summary:'Define funções, atuação e limites do subsíndico e do Conselho Consultivo/Fiscal.',deviceIds:byRange(25,30)},
  {id:'gestao-despesas',category:'Administração',title:'Despesas, contratações e administração cotidiana',summary:'Agrupa regras de gastos, contratação de serviços, orçamento e rotinas administrativas.',deviceIds:byRange(31,36)},

  {id:'areas-comuns-uso',category:'Áreas comuns',title:'Uso geral das áreas comuns',summary:'Define o direito de uso compartilhado, responsabilidades, conservação, danos e condições gerais de funcionamento dos espaços comuns.',deviceIds:byRange(37,45,d=>!['Áreas comuns e animais','Crianças nas áreas comuns'].includes(d.theme))},
  {id:'areas-comuns-pets-criancas',category:'Áreas comuns',title:'Animais e crianças nas áreas comuns',summary:'Reúne responsabilidades por animais e regras de supervisão de crianças nas áreas comuns.',deviceIds:byRange(37,45,d=>['Áreas comuns e animais','Crianças nas áreas comuns'].includes(d.theme))},
  {id:'portaria-acesso',category:'Acesso e circulação',title:'Portaria, visitantes e prestadores',summary:'Trata de identificação, registro e autorização de moradores, visitantes, prestadores e pessoas interessadas em imóveis.',deviceIds:byRange(46,49)},
  {id:'elevadores',category:'Acesso e circulação',title:'Uso dos elevadores',summary:'Agrupa regras de uso, restrições, capacidade e situações em que o elevador de serviço é obrigatório.',deviceIds:byRange(50,53)},
  {id:'carrinho',category:'Acesso e circulação',title:'Carrinho de compras',summary:'Define uso, devolução, conservação e proibições relativas aos carrinhos de compras.',deviceIds:byRange(54,54)},
  {id:'entregas',category:'Acesso e circulação',title:'Entregas e encomendas',summary:'Trata de entregadores, retirada na portaria, exceções, armazenamento, aviso e responsabilidade por encomendas.',deviceIds:byRange(55,59)},

  {id:'garagem-vagas',category:'Garagem e mobilidade',title:'Vagas, rodízio e uso do estacionamento',summary:'Define quantidade de vagas, rodízio, identificação de veículos, vagas acessíveis e regras gerais de estacionamento.',deviceIds:byRange(60,62)},
  {id:'garagem-conduta',category:'Garagem e mobilidade',title:'Conduta e segurança na garagem',summary:'Agrupa proibições, velocidade, circulação, visitantes, danos, ruídos, crianças e armazenamento de objetos.',deviceIds:byRange(63,69)},

  {id:'baby',category:'Lazer',title:'Espaço baby',summary:'Reúne horários, acompanhantes, limites de visitantes, conservação, ruído e atividades permitidas ou proibidas no espaço baby.',deviceIds:byRange(70,75)},
  {id:'jogos-zen',category:'Lazer',title:'Praça de jogos e Espaço Zen',summary:'Agrupa horários, finalidade dos espaços, silêncio, convivência, consumo, visitantes e uso compartilhado.',deviceIds:byRange(76,79)},
  {id:'playground-fitness-campo',category:'Lazer',title:'Playground, praça fitness e mini campo',summary:'Reúne regras de funcionamento, segurança, supervisão, equipamentos, horários e uso desses espaços.',deviceIds:byRange(80,84)},
  {id:'piscina',category:'Lazer',title:'Piscina',summary:'Trata de horários, convidados, capacidade, higiene, segurança, crianças e comportamento na piscina.',deviceIds:byRange(85,90)},
  {id:'churrasqueira-reserva',category:'Lazer',title:'Churrasqueira: acesso, reserva e taxa',summary:'Reúne horários, convidados, capacidade, antecedência de reserva, taxa e regras de cancelamento.',deviceIds:byRange(91,96)},
  {id:'churrasqueira-uso',category:'Lazer',title:'Churrasqueira: uso, ruído e responsabilidade',summary:'Agrupa limpeza, convidados, eventos proibidos, segurança, som, danos e responsabilidades de quem reserva.',deviceIds:byRange(97,105)},
  {id:'pet-areas',category:'Pets',title:'Pet play e pet-wash',summary:'Define vacinação, limite de animais, higiene, uso de guia, equipamentos e responsabilidades nos espaços destinados aos pets.',deviceIds:byRange(106,114)},
  {id:'festa-acesso',category:'Lazer',title:'Espaço Festa: quem pode usar e para quê',summary:'Trata de finalidade, capacidade, eventos proibidos, datas bloqueadas e horários do espaço de festas.',deviceIds:byRange(115,117)},
  {id:'festa-reserva',category:'Lazer',title:'Espaço Festa: reserva, limite anual e taxa',summary:'Agrupa regras de solicitação, quantidade de reservas, preferência, reservas extras, cobrança e cancelamento.',deviceIds:byRange(118,119)},
  {id:'festa-responsabilidade',category:'Lazer',title:'Espaço Festa: uso, som, vistoria e responsabilidade',summary:'Reúne termo de responsabilidade, rotina do condomínio, música, limpeza, danos, convidados e devolução do espaço.',deviceIds:byRange(120,125)},

  {id:'unidade-uso',category:'Dentro do apartamento',title:'Uso residencial e responsabilidades da unidade',summary:'Define o que pertence à unidade, uso residencial, chaves, manutenção e liberdade de mobiliar ou reformar dentro dos limites previstos.',deviceIds:byRange(126,129)},
  {id:'fachada-varanda',category:'Dentro do apartamento',title:'Fachada, varanda, portas e aparência externa',summary:'Agrupa regras sobre grades, películas, condensadoras, bandeiras, objetos externos, portas, telas, cortina de vidro e padronização visual.',deviceIds:merge(byRange(130,131,d=>['Fachada','Fachada e manifestações','Ar-condicionado','Segurança','Portas das unidades','Cortina de vidro e tela'].includes(d.theme)))},
  {id:'privacidade-camera',category:'Dentro do apartamento',title:'Câmeras e privacidade a partir da unidade',summary:'Trata de câmeras ou dispositivos voltados para áreas comuns ou para unidades de terceiros.',deviceIds:byRange(130,130,d=>d.theme==='Privacidade e câmeras')},
  {id:'churrasqueira-varanda',category:'Dentro do apartamento',title:'Churrasqueira na varanda',summary:'Define condições para churrasqueira na varanda e limites relacionados a fumaça, odores, ruído e incômodo.',deviceIds:byRange(130,130,d=>d.theme==='Churrasqueira na varanda')},
  {id:'obras-unidade',category:'Dentro do apartamento',title:'Intervenções e manutenção na unidade',summary:'Agrupa regras gerais sobre alterações que possam afetar o condomínio e responsabilidade pela manutenção interna.',deviceIds:byRange(132,133)},

  {id:'mudanca-agendamento',category:'Mudanças e obras',title:'Mudança: agendamento, horários e transporte',summary:'Trata de antecedência, horários permitidos, elevador de serviço, escadas e movimentação de objetos.',deviceIds:byRange(134,136)},
  {id:'mudanca-icamento',category:'Mudanças e obras',title:'Içamento de móveis e objetos',summary:'Reúne autorização, antecedência, empresa especializada, seguro, segurança, clima e inspeção após o içamento.',deviceIds:byRange(137,137)},
  {id:'mudanca-danos',category:'Mudanças e obras',title:'Mudança: danos, responsabilidades e logística',summary:'Agrupa responsabilidade por danos, reservas conflitantes, transporte, entulho, supervisão e deveres do condomínio.',deviceIds:byRange(138,143)},
  {id:'reforma-autorizacao',category:'Mudanças e obras',title:'Reforma: autorização, projeto e horários',summary:'Trata de reformas substanciais, ART/RRT, aprovação, prazos de análise e horários permitidos.',deviceIds:byRange(144,146)},
  {id:'reforma-execucao',category:'Mudanças e obras',title:'Reforma: transporte, ruído, resíduos e danos',summary:'Agrupa elevador, içamento, responsabilidade por danos, portas fechadas, corte de materiais, limpeza e descarte de resíduos.',deviceIds:byRange(147,153)},

  {id:'lixo-rotina',category:'Resíduos e sustentabilidade',title:'Lixo comum e coleta seletiva',summary:'Define acondicionamento, horários, elevador, separação de recicláveis e locais corretos de descarte.',deviceIds:byRange(154,158)},
  {id:'lixo-especial',category:'Resíduos e sustentabilidade',title:'Óleo, pilhas, eletrônicos e resíduos volumosos',summary:'Trata da destinação de óleo de cozinha, pilhas, baterias, eletrônicos e móveis ou objetos de grande volume.',deviceIds:byRange(159,162)},
  {id:'ocorrencias',category:'Administração',title:'Livro de ocorrências e canais formais',summary:'Define o Livro de Ocorrências, validade dos canais, forma de registro, prazo de resposta e período de arquivamento.',deviceIds:byRange(163,167)},

  {id:'pets-geral',category:'Pets',title:'Animais nas unidades e convivência geral',summary:'Reúne autorização para ter animais, limpeza, danos, ruído, excrementos, vacinação e observância das demais regras de circulação.',deviceIds:byRange(168,173)},
  {id:'drones',category:'Tecnologia e privacidade',title:'Uso de drones',summary:'Trata de autorização, privacidade, uso profissional, operação nas áreas comuns e responsabilidade por danos.',deviceIds:byRange(174,179)},
  {id:'telecom',category:'Tecnologia e privacidade',title:'Internet, antenas e telecomunicações',summary:'Agrupa padrões técnicos e estéticos, cabos, equipamentos externos, autorização e responsabilidade por instalações.',deviceIds:byRange(180,185)},
  {id:'digital-canais',category:'Tecnologia e privacidade',title:'Grupos, aplicativos e canais digitais do condomínio',summary:'Define finalidade dos canais institucionais e proíbe ofensas, desinformação, propaganda, exposição de dados e credenciais.',deviceIds:byRange(186,188)},
  {id:'dados-monitoramento',category:'Tecnologia e privacidade',title:'Proteção de dados e imagens de monitoramento',summary:'Trata de uso de dados pessoais, acesso e compartilhamento de imagens das câmeras e medidas de segurança digital.',deviceIds:byRange(189,192)},
  {id:'penalidades',category:'Penalidades',title:'Advertências, multas e reincidência',summary:'Reúne a escala de penalidades, multas progressivas, danos ao patrimônio e medidas aplicáveis em caso de reincidência.',deviceIds:byRange(193,198)},
  {id:'disposicoes-finais',category:'Regras gerais',title:'Disposições finais e aplicação do regimento',summary:'Agrupa as regras finais sobre vigência, interpretação, omissões e aplicação geral do Regimento Interno.',deviceIds:byRange(199,209)},
].filter(t=>t.deviceIds.length>0);

export const topicDevices=(topic:DecisionTopic)=>topic.deviceIds.map(id=>devices.find(d=>d.id===id)).filter(Boolean) as Device[];
export const categories=[...new Set(decisionTopics.map(t=>t.category))];
