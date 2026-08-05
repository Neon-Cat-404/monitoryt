import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.YOUTUBE_API_KEY!;

async function getChannelId(username: string) {
    const query = username.replace("@", "");

    const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=1&key=${API_KEY}`
    );

    const data = await res.json();

    if (!data.items?.length) {
        throw new Error("Channel not found");
    }

    return data.items[0].snippet.channelId;
}

async function getUploadsPlaylist(channelId: string) {
    const res = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${API_KEY}`
    );

    const data = await res.json();

    return data.items[0].contentDetails.relatedPlaylists.uploads;
}

async function getLatestVideos(playlistId: string, maxResults = 20) {
    const res = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${maxResults}&key=${API_KEY}`
    );

    const data = await res.json();

    return data.items.map((item: any) => ({
        title: item.snippet.title,
        thumbnail:
            item.snippet.thumbnails.maxres?.url ||
            item.snippet.thumbnails.high?.url ||
            item.snippet.thumbnails.medium?.url ||
            item.snippet.thumbnails.default?.url,
        publishedAt: item.snippet.publishedAt,
        videoId: item.snippet.resourceId.videoId,
    }));
}

function formatDuration(duration: string) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

    const h = Number(match?.[1] || 0);
    const m = Number(match?.[2] || 0);
    const s = Number(match?.[3] || 0);

    if (h)
        return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

    return `${m}:${String(s).padStart(2, "0")}`;
}

async function enrichVideos(videos: any[]) {
    const ids = videos.map(v => v.videoId).join(",");

    const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${ids}&key=${API_KEY}`
    );

    const data = await res.json();

    const info = new Map();

    data.items.forEach((item: any) => {
        info.set(item.id, {
            duration: formatDuration(item.contentDetails.duration),
            views: Number(item.statistics.viewCount).toLocaleString(),
        });
    });

    return videos.map(video => ({
        title: video.title,
        thumbnail: video.thumbnail,
        publishedAt: video.publishedAt,
        duration: info.get(video.videoId)?.duration ?? "",
        views: info.get(video.videoId)?.views ?? "0",
        url: `https://www.youtube.com/watch?v=${video.videoId}`,
    }));
}

export async function GET(request: NextRequest) {
    try {
        const channel =
            new URL(request.url).searchParams.get("channel");

        if (!channel) {
            return NextResponse.json(
                { error: "Missing channel parameter." },
                { status: 400 }
            );
        }

        const channelId = await getChannelId(channel);

        const uploads = await getUploadsPlaylist(channelId);

        const latest = await getLatestVideos(uploads, 20);

        const videos = await enrichVideos(latest);

        return NextResponse.json(videos);

    } catch (err: any) {
        return NextResponse.json(
            {
                error: err.message,
            },
            {
                status: 500,
            }
        );
    }
}