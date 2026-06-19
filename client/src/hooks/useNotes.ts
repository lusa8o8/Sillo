import { useQuery } from "@tanstack/react-query";
import { Note } from "@/lib/storage";
import { authedFetch } from "@/lib/api";

export function useNotes(vaultId: string | undefined): Note[] {
    const { data: notes = [] } = useQuery<Note[]>({
        queryKey: ['notes', vaultId],
        queryFn: async () => {
            if (!vaultId) return [];
            const res = await authedFetch(`/api/vaults/${vaultId}/notes`);
            if (!res.ok) return [];
            const data = await res.json();
            return data.map((note: any) => ({
                ...note,
                timestamp: Number(note.timestamp),
            }));
        },
        enabled: !!vaultId
    });

    return notes;
}
