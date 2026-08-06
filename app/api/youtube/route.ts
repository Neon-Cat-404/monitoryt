import { NextRequest, NextResponse } from "next/server";

import {
    S3Client,
    HeadObjectCommand,
    PutObjectCommand,
} from "@aws-sdk/client-s3";

const API_KEY = process.env.YOUTUBE_API_KEY!;
const r2 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

const BUCKET = process.env.R2_BUCKET!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

async function uploadThumbnail(videoId: string, ytUrl: string) {
    const key = `youtube/${videoId}.jpg`;

    // Check if already exists
    try {
    await r2.send(
        new HeadObjectCommand({
            Bucket: BUCKET,
            Key: key,
        })
    );

    console.log("Object exists");
} catch (e) {
    console.error("HEAD ERROR:", e);
}

    // Download thumbnail from YouTube
    const res = await fetch(ytUrl);

    if (!res.ok) {
        throw new Error("Failed to download thumbnail");
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    try{

    // Upload to R2
    await r2.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: buffer,
            ContentType: res.headers.get("content-type") ?? "image/jpeg",
            CacheControl: "public, max-age=31536000, immutable",
        })
    );
    console.log("Uploaded");
} catch(e) {console.error("UPLOAD ERROR:", e);}
    return `${PUBLIC_URL}/${key}`;
}

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

    return await Promise.all(
        data.items.map(async (item: any) => {
            const thumbnailUrl =
                item.snippet.thumbnails.maxres?.url ||
                item.snippet.thumbnails.high?.url ||
                item.snippet.thumbnails.medium?.url ||
                item.snippet.thumbnails.default?.url;

            const thumbnail = await uploadThumbnail(
                item.snippet.resourceId.videoId,
                thumbnailUrl
            );

            return {
                title: item.snippet.title,
                thumbnail,
                publishedAt: item.snippet.publishedAt,
                videoId: item.snippet.resourceId.videoId,
            };
        })
    );
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