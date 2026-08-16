import type { ManifestationChoice } from '../data/regimento';

export type ResidentRole = 'owner' | 'tenant';
export type Participant = { name:string; tower:'A'|'B'|'C'|'D'; apartment:string; role:ResidentRole };
export type SavedResponse = { choice:ManifestationChoice; comment?:string };
export type Responses = Record<string,SavedResponse>;
export type Aggregate = Record<string,Partial<Record<ManifestationChoice,number>>>;

const RESPONSE_KEY='torres-em-comum:responses';
const PARTICIPANT_KEY='torres-em-comum:participant';

export function loadResponses():Responses{try{return JSON.parse(localStorage.getItem(RESPONSE_KEY)||'{}')}catch{return {}}}
export function saveResponses(value:Responses){localStorage.setItem(RESPONSE_KEY,JSON.stringify(value));window.dispatchEvent(new Event('torres:data'))}
export function loadParticipant():Participant|null{try{return JSON.parse(localStorage.getItem(PARTICIPANT_KEY)||'null')}catch{return null}}
export function saveParticipant(value:Participant){localStorage.setItem(PARTICIPANT_KEY,JSON.stringify(value));window.dispatchEvent(new Event('torres:data'))}

// Enquanto o Supabase não estiver conectado, o painel usa a participação deste navegador.
// A assinatura do método já é compatível com a futura resposta agregada do banco.
export function loadAggregate():Aggregate{
 const responses=loadResponses();
 return Object.fromEntries(Object.entries(responses).map(([deviceId,response])=>[deviceId,{[response.choice]:1}]));
}

export const backendStatus = { mode:'local' as const, label:'Prévia local — banco central ainda não conectado' };
