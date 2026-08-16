import { devices as baseDevices } from './regimento';
import { adminDevices } from './regimento-admin';

export type { Device, ManifestationChoice } from './regimento';

export const devices = [...baseDevices, ...adminDevices].sort((a,b)=>a.article-b.article || a.id.localeCompare(b.id));
export const themes = [...new Set(devices.map(device=>device.theme))];
