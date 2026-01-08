import { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { VaultItem } from "@/lib/storage";

interface SilloContextType {
    vaults: VaultItem[];
    addVault: (url: string) => Promise<boolean>;
    getNotes: (videoId: string) => any[]; // Temporary any[] to avoid strict type issues during transition
    saveNote: (videoId: string, text: string, timestamp: number) => void;
    updateNote: (videoId: string, noteId: number, text: string) => void;
    deleteNote: (videoId: string, noteId: number) => void;
}

const SilloContext = createContext<SilloContextType | undefined>(undefined);

export function SilloProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();

    // Toggle storage mode: 'api' or 'local'
    // For Vercel Free Deployment, we can use 'api'!
    const STORAGE_MODE: string = 'api';
    const API_BASE = import.meta.env.VITE_API_URL || '';


    // Fetch Vaults
    const { data: vaults = [] } = useQuery<VaultItem[]>({
        queryKey: ['vaults'],
        queryFn: async () => {
            if (STORAGE_MODE === 'local') {
                return JSON.parse(localStorage.getItem('sillo-vaults') || '[]');
            }
            const res = await fetch(`${API_BASE}/api/vaults`);
            if (!res.ok) throw new Error('Failed to fetch vaults');
            return res.json();
        }
    });

    const addVaultMutation = useMutation({
        mutationFn: async (url: string) => {
            // 1. Fetch Metadata first
            let title = "New Learning Vault";
            let thumbnail = "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&q=80";

            try {
                const metaRes = await fetch(`${API_BASE}/api/metadata`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });
                if (metaRes.ok) {
                    const meta = await metaRes.json();
                    if (meta.title) title = meta.title;
                    if (meta.thumbnail) thumbnail = meta.thumbnail;
                }
            } catch (e) {
                console.warn("Failed to sync title", e);
            }

            const newVault = {
                id: crypto.randomUUID(), // Generate ID client-side for local
                type: 'video',
                title,
                url,
                thumbnail,
                addedAt: new Date().toISOString(),
                lastActive: new Date().toISOString(),
                progress: 0
            };

            if (STORAGE_MODE === 'local') {
                const current = JSON.parse(localStorage.getItem('sillo-vaults') || '[]');
                const updated = [newVault, ...current];
                localStorage.setItem('sillo-vaults', JSON.stringify(updated));
                return newVault;
            }

            const res = await fetch(`${API_BASE}/api/vaults`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newVault)
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vaults'] });
        }
    });

    const addVault = async (url: string) => {
        try {
            await addVaultMutation.mutateAsync(url);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    // Local Storage Note Helpers
    const getLocalNotes = (videoId: string) => {
        const allNotes = JSON.parse(localStorage.getItem('sillo-notes') || '{}');
        return allNotes[videoId] || [];
    };

    const saveLocalNote = (videoId: string, text: string, timestamp: number) => {
        const allNotes = JSON.parse(localStorage.getItem('sillo-notes') || '{}');
        const videoNotes = allNotes[videoId] || [];
        const newNote = { id: Date.now(), text, timestamp };
        allNotes[videoId] = [...videoNotes, newNote];
        localStorage.setItem('sillo-notes', JSON.stringify(allNotes));
    };

    return (
        <SilloContext.Provider
            value={{
                vaults,
                addVault,
                getNotes: (videoId) => {
                    if (STORAGE_MODE === 'local') return getLocalNotes(videoId);
                    return []; // API implementation pending for Player refactor
                },
                saveNote: (videoId, text, timestamp) => {
                    if (STORAGE_MODE === 'local') {
                        saveLocalNote(videoId, text, timestamp);
                        // Force update? In a real app we'd use Query for notes too.
                    }
                },
                updateNote: () => { },
                deleteNote: () => { },
            }}
        >
            {children}
        </SilloContext.Provider>
    );
}

export function useSillo() {
    const context = useContext(SilloContext);
    if (context === undefined) {
        throw new Error("useSillo must be used within a SilloProvider");
    }
    return context;
}
