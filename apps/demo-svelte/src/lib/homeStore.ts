import { writable, get } from 'svelte/store';

export type DeviceType = 'light' | 'thermostat' | 'lock' | 'blinds';

export interface Device {
  id:    string;
  name:  string;
  type:  DeviceType;
  on:    boolean;
  value?: number; // lumière: 0-100%, thermostat: °C
}

export interface Room {
  id:           string;
  name:         string;
  icon:         string;
  temperature?: number;
  devices:      Device[];
}

export interface HomeState {
  rooms:        Room[];
  activeScene:  string | null;
}

const INITIAL: HomeState = {
  activeScene: null,
  rooms: [
    {
      id: 'salon', name: 'Salon', icon: '🛋️', temperature: 21,
      devices: [
        { id: 'salon_light',  name: 'Lumière',  type: 'light',      on: true,  value: 80  },
        { id: 'salon_tv',     name: 'TV',        type: 'light',      on: false              },
        { id: 'salon_blinds', name: 'Stores',    type: 'blinds',     on: true,  value: 100 },
      ],
    },
    {
      id: 'chambre', name: 'Chambre', icon: '🛏️', temperature: 19,
      devices: [
        { id: 'chambre_light',  name: 'Lumière', type: 'light',      on: false, value: 50 },
        { id: 'chambre_blinds', name: 'Stores',  type: 'blinds',     on: true,  value: 80 },
        { id: 'chambre_clim',   name: 'Clim',    type: 'thermostat', on: false, value: 22 },
      ],
    },
    {
      id: 'cuisine', name: 'Cuisine', icon: '🍳', temperature: 23,
      devices: [
        { id: 'cuisine_light', name: 'Lumière', type: 'light', on: true,  value: 100 },
        { id: 'cuisine_hotte', name: 'Hotte',   type: 'light', on: false              },
      ],
    },
    {
      id: 'entree', name: 'Entrée', icon: '🚪',
      devices: [
        { id: 'entree_light', name: 'Lumière',  type: 'light', on: false, value: 60 },
        { id: 'entree_lock',  name: 'Serrure',  type: 'lock',  on: true              }, // on = verrouillé
      ],
    },
    {
      id: 'sdb', name: 'Salle de bain', icon: '🚿', temperature: 22,
      devices: [
        { id: 'sdb_light',   name: 'Lumière',    type: 'light',      on: false, value: 70 },
        { id: 'sdb_chauffe', name: 'Chauffe-eau', type: 'thermostat', on: true,  value: 55 },
      ],
    },
  ],
};

export const homeStore = writable<HomeState>(INITIAL);

// ── Helpers ───────────────────────────────────────────────────────

export function setDevice(deviceId: string, patch: Partial<Device>) {
  homeStore.update(h => ({
    ...h,
    rooms: h.rooms.map(r => ({
      ...r,
      devices: r.devices.map(d => d.id === deviceId ? { ...d, ...patch } : d),
    })),
  }));
}

export function setRoomLights(roomId: string, on: boolean, brightness?: number) {
  homeStore.update(h => ({
    ...h,
    rooms: h.rooms.map(r => r.id !== roomId ? r : {
      ...r,
      devices: r.devices.map(d => d.type !== 'light' ? d : {
        ...d, on, ...(brightness !== undefined && { value: brightness }),
      }),
    }),
  }));
}

export function setRoomTemp(roomId: string, temperature: number) {
  homeStore.update(h => ({
    ...h,
    rooms: h.rooms.map(r => r.id !== roomId ? r : { ...r, temperature }),
  }));
}

export const SCENES: Record<string, { label: string; icon: string; description: string }> = {
  réveil:  { label: 'Réveil',  icon: '☀️', description: 'Lumières à 80%, stores ouverts' },
  film:    { label: 'Film',    icon: '🎬', description: 'Salon tamisé, reste éteint'       },
  dîner:   { label: 'Dîner',   icon: '🍽️', description: 'Cuisine + salon à 70%'            },
  nuit:    { label: 'Nuit',    icon: '🌙', description: 'Tout éteint, porte verrouillée'   },
  absent:  { label: 'Absent',  icon: '🏃', description: 'Tout éteint, sécurité activée'    },
};

export function applyScene(scene: string) {
  homeStore.update(h => {
    let rooms = h.rooms;
    switch (scene) {
      case 'réveil':
        rooms = rooms.map(r => ({
          ...r,
          devices: r.devices.map(d =>
            d.type === 'light'   ? { ...d, on: true,  value: 80 }  :
            d.type === 'blinds'  ? { ...d, on: false }             : d
          ),
        }));
        break;
      case 'film':
        rooms = rooms.map(r => ({
          ...r,
          devices: r.devices.map(d =>
            d.type === 'light' ? { ...d, on: r.id === 'salon', value: r.id === 'salon' ? 20 : 0 } : d
          ),
        }));
        break;
      case 'dîner':
        rooms = rooms.map(r => ({
          ...r,
          devices: r.devices.map(d =>
            d.type === 'light' ? { ...d, on: r.id === 'salon' || r.id === 'cuisine', value: 70 } : d
          ),
        }));
        break;
      case 'nuit':
        rooms = rooms.map(r => ({
          ...r,
          devices: r.devices.map(d =>
            d.type === 'light' ? { ...d, on: false } :
            d.type === 'lock'  ? { ...d, on: true  } : d
          ),
        }));
        break;
      case 'absent':
        rooms = rooms.map(r => ({
          ...r,
          devices: r.devices.map(d =>
            d.type === 'light' ? { ...d, on: false } :
            d.type === 'lock'  ? { ...d, on: true  } : d
          ),
        }));
        break;
    }
    return { ...h, rooms, activeScene: scene };
  });
}

export function getRoomById(id: string): Room | undefined {
  return get(homeStore).rooms.find(r => r.id === id);
}

export const ROOM_IDS = ['salon', 'chambre', 'cuisine', 'entree', 'sdb'] as const;
export type RoomId = typeof ROOM_IDS[number];
