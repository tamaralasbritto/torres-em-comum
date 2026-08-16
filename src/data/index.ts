import { devices as baseDevices } from './regimento';
import { adminDevices } from './regimento-admin';
import { areaDevices3769 } from './regimento-areas-37-69';
import { leisureDevices7090 } from './regimento-lazer-70-90';
import { leisureDevices91125 } from './regimento-lazer-91-125';

export type { Device, ManifestationChoice } from './regimento';

export const devices = [...baseDevices, ...adminDevices, ...areaDevices3769, ...leisureDevices7090, ...leisureDevices91125].sort((a,b)=>a.article-b.article || a.id.localeCompare(b.id));
export const themes = [...new Set(devices.map(device=>device.theme))];
