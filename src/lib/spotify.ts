interface SpotifyOEmbed {
  title: string;
  thumbnail_url: string;
  thumbnail_width: number;
  thumbnail_height: number;
}

const OEMBED_BASE = 'https://open.spotify.com/oembed';

export async function getTrackArtwork(trackId: string): Promise<string | null> {
  try {
    const url = `${OEMBED_BASE}?url=${encodeURIComponent(`https://open.spotify.com/track/${trackId}`)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data: SpotifyOEmbed = await res.json();
    return data.thumbnail_url;
  } catch {
    return null;
  }
}

export async function getMultipleTrackArtworks(
  trackIds: string[],
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const batchSize = 5;
  for (let i = 0; i < trackIds.length; i += batchSize) {
    const batch = trackIds.slice(i, i + batchSize);
    const artworks = await Promise.all(
      batch.map(async (id) => {
        const url = await getTrackArtwork(id);
        return { id, url };
      }),
    );
    for (const { id, url } of artworks) {
      if (url) results.set(id, url);
    }
  }
  return results;
}

export function spotifyTrackUrl(trackId: string): string {
  return `https://open.spotify.com/track/${trackId}`;
}

export function spotifyEmbedUrl(
  type: 'track' | 'album' | 'playlist',
  id: string,
): string {
  return `https://open.spotify.com/embed/${type}/${id}?theme=0`;
}
