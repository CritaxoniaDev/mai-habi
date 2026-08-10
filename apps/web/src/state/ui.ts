import { create } from 'zustand';

export type PaletteMode = 'commands' | 'files';
export type DialogName = 'share' | 'settings' | 'dependencies' | 'script-picker';

export interface PromptRequest {
  title: string;
  label: string;
  placeholder?: string;
  hint?: string;
  initialValue?: string;
  confirmLabel?: string;
  /** Returns a message explaining what is wrong, or null when acceptable. */
  validate?: (value: string) => string | null;
  onSubmit: (value: string) => void;
}

interface UiState {
  palette: PaletteMode | null;
  dialog: DialogName | null;
  prompt: PromptRequest | null;
  setPalette: (mode: PaletteMode | null) => void;
  setDialog: (dialog: DialogName | null) => void;
  /** Replaces `window.prompt`, which cannot be themed, labelled or validated. */
  requestInput: (request: PromptRequest) => void;
  closePrompt: () => void;
}

/**
 * Cross-island UI state: the header opens dialogs that the workspace island
 * renders, and the command palette can trigger both.
 */
export const useUi = create<UiState>((set) => ({
  palette: null,
  dialog: null,
  prompt: null,
  setPalette: (palette) => set({ palette }),
  setDialog: (dialog) => set({ dialog }),
  requestInput: (prompt) => set({ prompt }),
  closePrompt: () => set({ prompt: null }),
}));
