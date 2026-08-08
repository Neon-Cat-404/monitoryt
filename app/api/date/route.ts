import { NextResponse } from "next/server";

const API_KEY = process.env.YOUTUBE_API_KEY!;

const CHANNELS = [
  "@ThinkSchool",
  "@Backstagewithmillionaires",
  "@Vaibhavsisnity",
  "@Varunmayya",
"@BYAnuragBansal",
  "@BuildersCentral",
    "@getsetfly",
    "@GauravThakur-GSF",
    "Breakdownbyaeos"
];

import {
    S3Client,
    HeadObjectCommand,
    PutObjectCommand,
} from "@aws-sdk/client-s3";

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
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(
      username.replace("@", "")
    )}&maxResults=1&key=${API_KEY}`
  );

  const data = await res.json();

  if (!data.items?.length) return null;

  return data.items[0].snippet.channelId;
}

async function getUploadsPlaylist(channelId: string) {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${API_KEY}`
  );

  const data = await res.json();

  return data.items[0].contentDetails.relatedPlaylists.uploads;
}

async function getVideos(playlistId: string) {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=10&key=${API_KEY}`
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
    videoId: item.snippet.resourceId.videoId,
    publishedAt: item.snippet.publishedAt,
    channel: item.snippet.channelTitle,
    url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
    thumbnail: thumbnail
    };
  })
)
}

export async function GET() {
  try {
    const allVideos = await Promise.all(
      CHANNELS.map(async (username) => {
        const channelId = await getChannelId(username);

        if (!channelId) return [];

        const uploads = await getUploadsPlaylist(channelId);

        return getVideos(uploads);
      })
    );

    const today = new Date();

    const start = new Date(today);
    start.setHours(0, 0, 0, 0);

    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    const videos = allVideos
      .flat()
      .filter((video) => {
        const d = new Date(video.publishedAt);
        return d >= start && d <= end;
      })
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() -
          new Date(a.publishedAt).getTime()
      );

    return NextResponse.json(videos);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}