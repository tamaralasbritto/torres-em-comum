import { devices, type ManifestationChoice } from '../data';

export type ResidentRole = 'owner' | 'tenant';
export type Participant = { name:string; tower:'A'|'B'|'C'|'D'; apartment:string; role:ResidentRole };
export type SavedResponse = { choice:ManifestationChoice; comment?:string };
export type Responses = Record<string,SavedResponse>;
export type ParticipationStatus = 'draft'|'finalized'|'conflicted'|'superseded';
export type RemoteSession = { participantId:string; protocolId:string; resumeToken:string; status:ParticipationStatus; lastSavedAt?:string };
export type FinalReceipt = { protocolId:string; status:Exclude<ParticipationStatus,'draft'>; finalizedAt:string; payloadHash:string; countsInPanel:boolean; conflict?:{code:string;message:string}|null };
export type PublicPanelDevice = {
  deviceId:string;
  responses:number|'5+';
  counts:Partial<Record<ManifestationChoice,number|'<5'>>;
  percentages:Partial<Record<ManifestationChoice,number>>|null;
  suppressed:boolean;
};
export type PublicPanel = { k:number; participatingUnits:number|null; unitsAwaitingValidation?:number; devices:PublicPanelDevice[] };

const RESPONSE_KEY='torres-em-comum:responses';
const PARTICIPANT_KEY='torres-em-comum:participant';
const SESSION_KEY='torres-em-comum:remote-session';
const RECEIPT_KEY='torres-em-comum:final-receipt';
const API_URL='https://hzcpbbnjoeyyfwxdsbxt.supabase.co/functions/v1/participation';
const DEVICE_MANIFEST=[...new Set(devices.map(device=>device.id))].sort();

export function loadResponses():Responses{try{return JSON.parse(localStorage.getItem(RESPONSE_KEY)||'{}')}catch{return {}}}
export function saveResponses(value:Responses){localStorage.setItem(RESPONSE_KEY,JSON.stringify(value))}
export function loadParticipant():Participant|null{try{return JSON.parse(localStorage.getItem(PARTICIPANT_KEY)||'null')}catch{return null}}
export function saveParticipant(value:Participant){localStorage.setItem(PARTICIPANT_KEY,JSON.stringify(value))}
export function loadRemoteSession():RemoteSession|null{try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
export function saveRemoteSession(value:RemoteSession|null){value?localStorage.setItem(SESSION_KEY,JSON.stringify(value)):localStorage.removeItem(SESSION_KEY)}
export function loadFinalReceipt():FinalReceipt|null{try{return JSON.parse(localStorage.getItem(RECEIPT_KEY)||'null')}catch{return null}}
export function saveFinalReceipt(value:FinalReceipt|null){value?localStorage.setItem(RECEIPT_KEY,JSON.stringify(value)):localStorage.removeItem(RECEIPT_KEY)}

function serializeResponses(value:Responses){return Object.entries(value).map(([device_id,response])=>({device_id,choice:response.choice,comment:response.comment?.trim()||null}))}
async function api<T>(payload:Record<string,unknown>):Promise<T>{const response=await fetch(API_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});let data:any={};try{data=await response.json()}catch{}if(!response.ok)throw new Error(data.error||`http_${response.status}`);return data as T}

export async function createRemoteDraft(participant:Participant):Promise<RemoteSession>{const result=await api<any>({action:'create',...participant});const session:RemoteSession={participantId:result.participantId,protocolId:result.protocolId,resumeToken:result.resumeToken,status:'draft',lastSavedAt:result.lastSavedAt};saveRemoteSession(session);saveFinalReceipt(null);return session}
export async function resumeRemoteDraft(session:RemoteSession):Promise<{participant:Participant;responses:Responses;lastSavedAt?:string}>{const result=await api<any>({action:'resume',participantId:session.participantId,resumeToken:session.resumeToken});const responses:Responses=Object.fromEntries((result.responses||[]).map((r:any)=>[r.device_id,{choice:r.choice,comment:r.comment||undefined}]));return{participant:{name:result.participant.name,tower:result.participant.tower,apartment:result.participant.apartment,role:result.participant.role},responses,lastSavedAt:result.participant.lastSavedAt}}
export async function saveRemoteDraft(session:RemoteSession,responses:Responses):Promise<string>{const result=await api<any>({action:'save',participantId:session.participantId,resumeToken:session.resumeToken,deviceManifest:DEVICE_MANIFEST,responses:serializeResponses(responses)});return result.lastSavedAt}
export async function finalizeRemoteDraft(session:RemoteSession,responses:Responses):Promise<FinalReceipt>{const result=await api<any>({action:'finalize',participantId:session.participantId,resumeToken:session.resumeToken,deviceManifest:DEVICE_MANIFEST,responses:serializeResponses(responses)});const receipt:FinalReceipt={protocolId:result.protocolId,status:result.status,finalizedAt:result.finalizedAt,payloadHash:result.payloadHash,countsInPanel:result.countsInPanel===true,conflict:result.conflict||null};saveFinalReceipt(receipt);saveRemoteSession({...session,status:result.status});return receipt}
export async function loadPublicPanel():Promise<PublicPanel>{return api<PublicPanel>({action:'panel'})}

export const backendStatus={mode:'central' as const,label:'Banco central protegido · dados públicos somente com k ≥ 5'};
