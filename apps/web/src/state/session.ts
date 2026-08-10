import { create } from 'zustand';
import type { User } from '@mai-habi/types';
import { getCurrentUser, getGuestIdentity, isCloudEnabled, onAuthChange } from '@mai-habi/shared';

interface SessionState {
  ready: boolean;
  cloudEnabled: boolean;
  user: User | null;
  guestId: string | null;
  initialise: () => Promise<void>;
  setUser: (user: User | null) => void;
}

let started = false;

/**
 * Authentication is optional, so nothing here blocks the editor from rendering.
 * Guests get a local identity and never see a sign-in wall.
 */
export const useSession = create<SessionState>((set) => ({
  ready: false,
  cloudEnabled: isCloudEnabled(),
  user: null,
  guestId: null,

  async initialise() {
    if (started) return;
    started = true;

    const guest = await getGuestIdentity();
    set({ guestId: guest.id });

    if (!isCloudEnabled()) {
      set({ ready: true });
      return;
    }

    const user = await getCurrentUser();
    set({ user, ready: true });

    void onAuthChange((next) => set({ user: next }));
  },

  setUser(user) {
    set({ user });
  },
}));
