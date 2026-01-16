import { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { VaultItem } from "@/lib/storage";

interface SilloContextType {
    vaults: VaultItem[];
    addVault: (url: string) => Promise<{ success: boolean; error?: string }>;
    deleteVault: (id: string) => Promise<boolean>;
    deleteVault: (id: string) => Promise<boolean>;
    saveNote: (vaultId: string, text: string, timestamp: number) => Promise<void>;
    updateNote: (vaultId: string, noteId: number, text: string) => void;
    deleteNote: (vaultId: string, noteId: number) => void;
}

const SilloContext = createContext<SilloContextType | undefined>(undefined);

export function SilloProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();

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
            if (STORAGE_MODE === 'local') {
                // Local mode doesn't support the metadata fix easily here, 
                // but we are focused on API mode.
                const newVault = {
                    id: crypto.randomUUID(),
                    type: 'video',
                    title: "New Learning Vault",
                    url,
                    thumbnail: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&q=80",
                    addedAt: new Date().toISOString(),
                    lastActive: new Date().toISOString(),
                    progress: 0
                };
                const current = JSON.parse(localStorage.getItem('sillo-vaults') || '[]');
                localStorage.setItem('sillo-vaults', JSON.stringify([newVault, ...current]));
                return newVault;
            }

            // 1. Fetch Metadata first
            const metaRes = await fetch(`${API_BASE}/api/metadata`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            if (!metaRes.ok) {
                const errData = await metaRes.json();
                throw new Error(errData.error || "Failed to fetch video metadata. Please check the URL.");
            }

            const meta = await metaRes.json();

            const isPlaylist = url.includes("list=");
            const newVault = {
                type: isPlaylist ? 'playlist' : 'video',
                title: meta.title || (isPlaylist ? "New Learning Playlist" : "New Learning Vault"),
                url,
                thumbnail: meta.thumbnail || "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&q=80",
            };

            const res = await fetch(`${API_BASE}/api/vaults`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newVault)
            });

            if (!res.ok) throw new Error("Failed to save vault to database.");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vaults'] });
        }
    });

    const deleteVaultMutation = useMutation({
        mutationFn: async (id: string) => {
            if (STORAGE_MODE === 'local') {
                const current = JSON.parse(localStorage.getItem('sillo-vaults') || '[]');
                const filtered = current.filter((v: any) => v.id !== id);
                localStorage.setItem('sillo-vaults', JSON.stringify(filtered));
                return true;
            }

            const res = await fetch(`${API_BASE}/api/vaults/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error("Failed to delete vault");
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vaults'] });
        }
    });

    const addVault = async (url: string) => {
        try {
            await addVaultMutation.mutateAsync(url);
            return { success: true };
        } catch (e: any) {
            console.error(e);
            return { success: false, error: e.message };
        }
    };

    const deleteVault = async (id: string) => {
        try {
            await deleteVaultMutation.mutateAsync(id);
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
                deleteVault,
                saveNote: async (videoId, text, timestamp) => {
                    if (STORAGE_MODE === 'local') {
                        saveLocalNote(videoId, text, timestamp);
                        queryClient.invalidateQueries({ queryKey: ['notes', videoId] });
                        return;
                    }

                    try {
                        await fetch(`${API_BASE}/api/vaults/${videoId}/notes`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ text, timestamp: timestamp.toString() }),
                        });
                        queryClient.invalidateQueries({ queryKey: ['notes', videoId] });
                    } catch (e) {
                        console.error("Failed to save note:", e);
                    }
                },
                updateNote: async (videoId, noteId, text) => {
                    // Note update endpoint not yet implemented on server, but can mock or add later
                    if (STORAGE_MODE === 'local') {
                        // ... local update logic ...
                    }
                },
                deleteNote: async (videoId, noteId) => {
                    // Note delete endpoint not yet implemented on server
                },
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
