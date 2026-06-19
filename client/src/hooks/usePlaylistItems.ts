import { useQuery } from "@tanstack/react-query";
import { authedFetch } from "@/lib/api";

interface PlaylistItem {
    id: string;
    title: string;
    thumbnail: string;
    channelTitle: string;
    description: string;
    publishedAt: string;
}

export function usePlaylistItems(playlistId: string | undefined): PlaylistItem[] {
    const { data: items = [] } = useQuery({
        queryKey: ['playlist', playlistId],
        queryFn: async () => {
            if (!playlistId) return [];
            const res = await authedFetch(`/api/playlists/${playlistId}/items`);
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!playlistId && (playlistId.startsWith("PL") || playlistId.length > 15)
    });

    return items;
}
