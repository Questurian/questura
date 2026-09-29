import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DevStore {
  mapsEnabled: boolean;
  toggleMapsEnabled: () => void;
}

export const useDevStore = create<DevStore>()(
  persist(
    (set) => ({
      mapsEnabled: true,
      toggleMapsEnabled: () =>
        set((s) => ({ mapsEnabled: !s.mapsEnabled })),
    }),
    { name: 'dev-store' }
  )
);
