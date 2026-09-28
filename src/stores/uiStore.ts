import { create } from 'zustand';

type Theme = 'light' | 'dark';

const readTheme = (): Theme => {
  try {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface UiStore {
  theme: Theme;
  toggleTheme: () => void;
  demoOpen: boolean;
  setDemoOpen: (v: boolean) => void;
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  vehiclePickerOpen: boolean;
  setVehiclePickerOpen: (v: boolean) => void;
  /** Map area hidden behind panels — the camera centres within the rest. */
  mapInsets: Insets;
  setMapInsets: (i: Insets) => void;
  /** Camera state published by the map. */
  mapFree: boolean;
  setMapFree: (v: boolean) => void;
  mapControls: { zoomBy?: (f: number) => void; recenter?: () => void };
  setMapControls: (c: UiStore['mapControls']) => void;
}

export const useUi = create<UiStore>((set, get) => ({
  theme: readTheme(),
  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem('cf-theme', next);
    } catch {
      /* storage unavailable — theme still switches for this session */
    }
    set({ theme: next });
  },
  demoOpen: false,
  setDemoOpen: (v) => set({ demoOpen: v }),
  chatOpen: false,
  setChatOpen: (v) => set({ chatOpen: v }),
  vehiclePickerOpen: false,
  setVehiclePickerOpen: (v) => set({ vehiclePickerOpen: v }),
  mapInsets: { top: 80, right: 24, bottom: 24, left: 440 },
  setMapInsets: (i) => {
    const c = get().mapInsets;
    if (c.top !== i.top || c.left !== i.left || c.bottom !== i.bottom || c.right !== i.right) set({ mapInsets: i });
  },
  mapFree: false,
  setMapFree: (v) => get().mapFree !== v && set({ mapFree: v }),
  mapControls: {},
  setMapControls: (c) => set({ mapControls: c }),
}));
