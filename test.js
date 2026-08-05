const API_KEY = "AIzaSyAEhIgZdOT3oygqDjok801P_8T3awYvyHc";
const CHANNEL_NAME = "@ThinkSchool"; // Change this

async function getChannelId(name) {
    // Remove @ if present
    const query = name.replace("@", "");

    const url =
        `https://www.googleapis.com/youtube/v3/search` +
        `?part=snippet&type=channel&q=${encodeURIComponent(query)}` +
        `&maxResults=1&key=${API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.items || data.items.length === 0) {
        throw new Error("Channel not found.");
    }

    return data.items[0].snippet.channelId;
}

async function getUploadsPlaylist(channelId) {
    const url =
        `https://www.googleapis.com/youtube/v3/channels` +
        `?part=contentDetails&id=${channelId}` +
        `&key=${API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    return data.items[0].contentDetails.relatedPlaylists.uploads;
}

async function getLatestVideos(playlistId, maxResults) {
    const url =
        `https://www.googleapis.com/youtube/v3/playlistItems` +
        `?part=snippet` +
        `&playlistId=${playlistId}` +
        `&maxResults=${maxResults}` +
        `&key=${API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    return data.items.map(item => ({
        title: item.snippet.title,
        publishedAt: item.snippet.publishedAt,
        videoId: item.snippet.resourceId.videoId,
        url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`
    }));
}

async function main() {
    try {
        console.log("Searching channel...");

        const channelId = await getChannelId(CHANNEL_NAME);
        console.log("Channel ID:", channelId);

        const uploadsPlaylist = await getUploadsPlaylist(channelId);
        console.log("Uploads Playlist:", uploadsPlaylist);

        const videos = await getLatestVideos(uploadsPlaylist, 20);

        console.log("\nLatest Videos\n");

        videos.forEach((video, index) => {
            console.log(`${index + 1}. ${video.title}`);
            console.log(`Published : ${video.publishedAt}`);
            console.log(`URL       : ${video.url}`);
            console.log("----------------------------------------");
        });

    } catch (err) {
        console.error(err);
    }
}

main();