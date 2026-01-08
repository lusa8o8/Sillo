// Types
export interface Note {
    id: number;
    videoId: string;
    timestamp: number;
    text: string;
    createdAt: number;
}

export interface VaultItem {
    id: string;
    type: 'video' | 'playlist' | 'channel';
    title: string;
    url: string;
    thumbnail: string;
    addedAt: number;
    lastActive: number;
    progress: number;
    totalDuration?: number; // Seconds
}

const STORAGE_KEYS = {
    NOTES: 'sillo_notes',
    VAULTS: 'sillo_vaults',
    SETTINGS: 'sillo_settings',
} as const;

// Helpers
export const storage = {
    getNotes: (videoId: string): Note[] => {
        try {
            const allNotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || '{}');
            return allNotes[videoId] || [];
        } catch (e) {
            console.error('Failed to parse notes', e);
            return [];
        }
    },

    saveNote: (videoId: string, note: Note) => {
        try {
            const allNotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || '{}');
            const videoNotes = allNotes[videoId] || [];
            const updatedNotes = [...videoNotes, note];
            allNotes[videoId] = updatedNotes;
            localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(allNotes));
            return updatedNotes;
        } catch (e) {
            console.error('Failed to save note', e);
            return [];
        }
    },

    updateNote: (videoId: string, noteId: number, newText: string) => {
        try {
            const allNotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || '{}');
            const videoNotes: Note[] = allNotes[videoId] || [];
            const updatedNotes = videoNotes.map(n => n.id === noteId ? { ...n, text: newText } : n);
            allNotes[videoId] = updatedNotes;
            localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(allNotes));
            return updatedNotes;
        } catch (e) {
            console.error('Failed to update note', e);
            return [];
        }
    },

    deleteNote: (videoId: string, noteId: number) => {
        try {
            const allNotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || '{}');
            const videoNotes: Note[] = allNotes[videoId] || [];
            const updatedNotes = videoNotes.filter(n => n.id !== noteId);
            allNotes[videoId] = updatedNotes;
            localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(allNotes));
            return updatedNotes;
        } catch (e) {
            console.error('Failed to delete note', e);
            return [];
        }
    },

    getVaults: (): VaultItem[] => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.VAULTS) || '[]');
        } catch (e) {
            return [];
        }
    },

    addVault: (item: VaultItem) => {
        try {
            const vaults = JSON.parse(localStorage.getItem(STORAGE_KEYS.VAULTS) || '[]');
            const newVaults = [item, ...vaults];
            localStorage.setItem(STORAGE_KEYS.VAULTS, JSON.stringify(newVaults));
            return newVaults;
        } catch (e) {
            return [];
        }
    }
};
