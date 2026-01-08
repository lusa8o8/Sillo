export function getYouTubeId(url: string): string | null {
    // Check for Playlist first
    const playlistRegExp = /[?&]list=([^#&?]+)/;
    const playlistMatch = url.match(playlistRegExp);
    if (playlistMatch) return playlistMatch[1];

    // Fallback to Video ID
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

export function getYouTubeThumbnail(videoId: string): string {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

export function isValidYouTubeUrl(url: string): boolean {
    return !!getYouTubeId(url);
}
