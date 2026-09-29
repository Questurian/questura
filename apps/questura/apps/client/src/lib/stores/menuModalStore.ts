import { create } from 'zustand';

interface MenuModalState {
  isOpen: boolean;
  /** The reader pointed at, focused or touched the menu button. */
  isWarm: boolean;
}

interface MenuModalActions {
  openMenuModal: () => void;
  warmMenuModal: () => void;
  closeMenuModal: () => void;
}

type MenuModalStore = MenuModalState & MenuModalActions;

export const useMenuModalStore = create<MenuModalStore>((set) => ({
  // Initial state
  isOpen: false,
  isWarm: false,

  // Actions
  openMenuModal: () => {
    set({ isOpen: true });
  },

  warmMenuModal: () => {
    // Once is enough: hovering again must not re-render every subscriber.
    set((state) => (state.isWarm ? state : { isWarm: true }));
  },

  closeMenuModal: () => {
    set({ isOpen: false });
  },
}));
