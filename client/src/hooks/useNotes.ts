import { useQuery } from "@tanstack/react-query";
import { Note } from "@/lib/storage";

const API_BASE = import.meta.env.VITE_API_URL || '';
const STORAGE_MODE = 'api'; // Should match context or be provided via env/context

export function useNotes(vaultId: string | undefined): Note[] {
    const { data: notes = [] } = useQuery<Note[]>({
        queryKey: ['notes', vaultId],
        queryFn: async () => {
            if (!vaultId) return [];
            if (STORAGE_MODE === 'local') {
                const allNotes = JSON.parse(localStorage.getItem('sillo-notes') || '{}');
                return allNotes[vaultId] || [];
            }
            const res = await fetch(`${API_BASE}/api/vaults/${vaultId}/notes`);
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!vaultId
    });

    return notes;
}
