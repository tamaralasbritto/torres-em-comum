import { devices as baseDevices } from './regimento';
import { adminDevices } from './regimento-admin';
import { areaDevices3769 } from './regimento-areas-37-69';

export type { Device, ManifestationChoice } from './regimento';

export const devices = [...baseDevices, ...adminDevices, ...areaDevices3769].sort((a,b)=>a.article-b.article || a.id.localeCompare(b.id));
export const themes = [...new Set(devices.map(device=>device.theme))];
