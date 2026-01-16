export interface YouTubeResult {
    id: string;
    type: 'video' | 'playlist';
    title: string;
    thumbnail: string;
    channelTitle: string;
    description: string;
    publishedAt: string;
    duration?: string; // Optional, hard to get in search quickly without extra quota
}

const MOCK_RESULTS: YouTubeResult[] = [
    {
        id: "WjJUPxBa1ls",
        type: "video",
        title: "Python 3.12 Tutorial - Fast & Comprehensive",
        channelTitle: "Tech with Tim",
        thumbnail: "https://i.ytimg.com/vi/WjJUPxBa1ls/hqdefault.jpg",
        description: "Learn Python 3.12 in this full course for beginners.",
        publishedAt: "2024-01-01T00:00:00Z"
    },
    {
        id: "PLLRqwX-V7n8bPhlsN9R5wDdB3iu_C5J6",
        type: "playlist",
        title: "Full Stack Web Development Boot Camp",
        channelTitle: "Traversy Media",
        thumbnail: "https://i.ytimg.com/vi/0pThnRneDjw/hqdefault.jpg",
        description: "A complete guide to full stack web development.",
        publishedAt: "2023-05-15T00:00:00Z"
    },
    {
        id: "rfscVS0vtbw",
        type: "video",
        title: "Learn Python in 4 Hours",
        channelTitle: "freeCodeCamp.org",
        thumbnail: "https://i.ytimg.com/vi/rfscVS0vtbw/hqdefault.jpg",
        description: "Full Python course for beginners.",
        publishedAt: "2018-07-11T00:00:00Z"
    }
];

export async function searchYouTube(query: string, filters: { type?: string, duration?: string } = {}): Promise<YouTubeResult[]> {
    if (!process.env.YOUTUBE_API_KEY) {
        console.log("[YouTube Service] No API Key, returning instruction");
        return [{
            id: "instruction-placeholder",
            type: "video",
            title: "⚠️ Setup Required: Add YOUTUBE_API_KEY to .env",
            channelTitle: "System",
            thumbnail: "https://placehold.co/600x400/000000/FFF?text=Add+API+Key",
            description: "To enable real YouTube search, you must obtain a generic YouTube Data API Key and add it to your .env file as YOUTUBE_API_KEY.",
            publishedAt: new Date().toISOString()
        }];
    }

    try {
        const typeFilter = filters.type === 'playlist' ? 'playlist' : 'video';

        // This is a simplified implementation. Real one would handle page tokens etc.
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=${typeFilter}&key=${process.env.YOUTUBE_API_KEY}&maxResults=12`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`YouTube API Error: ${response.statusText}`);
        }
        const data = await response.json();

        return data.items.map((item: any) => ({
            id: item.id.videoId || item.id.playlistId,
            type: item.id.playlistId ? 'playlist' : 'video',
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
            channelTitle: item.snippet.channelTitle,
            description: item.snippet.description,
            publishedAt: item.snippet.publishedAt
        }));
    } catch (error) {
        console.error("YouTube Search Failed:", error);
        return [];
    }
}

export async function getPlaylistItems(playlistId: string): Promise<YouTubeResult[]> {
    if (!process.env.YOUTUBE_API_KEY) return [];

    try {
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${process.env.YOUTUBE_API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.error(`YouTube Playlist Error: ${response.statusText}`);
            return [];
        }

        const data = await response.json();

        return data.items.map((item: any) => ({
            id: item.snippet.resourceId.videoId,
            type: 'video',
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
            channelTitle: item.snippet.channelTitle,
            description: item.snippet.description,
            publishedAt: item.snippet.publishedAt
        })).filter((item: any) => item.title !== "Private video"); // Filter out private videos

    } catch (error) {
        console.error("Failed to fetch playlist items:", error);
        return [];
    }
}
