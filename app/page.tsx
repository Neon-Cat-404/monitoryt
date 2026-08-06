"use client";

import { useState } from "react";

type Video = {
  title: string;
  thumbnail: string;
  duration: string;
  url: string;
  publishedAt: string;
};

export default function Page() {
  const [channel, setChannel] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!channel.trim()) return;

    setLoading(true);

    try {
      const res = await fetch(
        `/api/youtube?channel=${encodeURIComponent(channel)}`
      );

      const data = await res.json();
      console.log(data);
      setVideos(data);
    } catch (e) {
      console.error(e);
      alert("Failed to fetch videos.");
    }

    setLoading(false);
  }

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    alert("Copied!");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-14">

        <div className="text-center">

          <h1 className="text-5xl font-black tracking-tight">
            YouTube Fetcher
          </h1>

          <p className="text-zinc-400 mt-3">
            Search any channel and instantly fetch its latest videos.
          </p>

        </div>

        <div className="flex flex-col space-y-2 justify-center items-center mt-5">
          <h2 className="text-[#ffffff90] font-bold text-xl">Recommended</h2>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-2 text-semibold">
            <div className="rounded-3xl bg-zinc-900 px-3 py-4 overflow-hidden cursor-pointer" onClick={() => setChannel("@ThinkSchool")}>@ThinkSchool</div>
            <div className="rounded-3xl bg-zinc-900 px-3 py-4 overflow-hidden cursor-pointer" onClick={() => setChannel("@ThinkSchool_Hindi")}>@ThinkSchool_Hindi</div>
            <div className="rounded-3xl bg-zinc-900 px-3 py-4 overflow-hidden cursor-pointer" onClick={() => setChannel("@Backstagewithmillionaires")}>@Backstagewithmillionaires</div>
            <div className="rounded-3xl bg-zinc-900 px-3 py-4 overflow-hidden cursor-pointer" onClick={() => setChannel("@Vaibhavsisnity")}>@Vaibhavsisnity</div>
            <div className="rounded-3xl bg-zinc-900 px-3 py-4 overflow-hidden cursor-pointer" onClick={() => setChannel("@Varunmayya")}>@Varunmayya</div>
            <div className="rounded-3xl bg-zinc-900 px-3 py-4 overflow-hidden cursor-pointer" onClick={() => setChannel("@ByAnuragBansal")}>@ByAnuragBansal</div>
            <div className="rounded-3xl bg-zinc-900 px-3 py-4 overflow-hidden cursor-pointer" onClick={() => setChannel("@BuildersCentral")}>@BuildersCentral</div>
          </div>
        </div>

        <div className="mt-10 flex gap-4 max-w-3xl mx-auto">

          <input
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="@MrBeast"
            className="flex-1 rounded-2xl bg-zinc-900 border border-zinc-700 px-6 py-4 outline-none focus:border-red-500"
          />

          <button
            onClick={search}
            className="rounded-2xl bg-red-600 hover:bg-red-500 px-8 font-bold transition"
          >
            {loading ? "Loading..." : "Search"}
          </button>

        </div>

        {loading && (

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8 mt-14">

            {Array.from({ length: 6 }).map((_, i) => (

              <div
                key={i}
                className="animate-pulse rounded-3xl bg-zinc-900 overflow-hidden"
              >

                <div className="h-52 bg-zinc-800" />

                <div className="p-6">

                  <div className="h-5 bg-zinc-700 rounded mb-4" />

                  <div className="h-4 w-1/2 bg-zinc-700 rounded" />

                </div>

              </div>

            ))}

          </div>

        )}

        {!loading && (

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8 mt-14">

            {videos.map((video, index) => (

              <div
                key={index}
                className="rounded-3xl overflow-hidden bg-white/5 border border-white/10 backdrop-blur-xl hover:scale-[1.02] transition"
              >

                <div className="relative">

                  <img
                    src={video.thumbnail}
                    className="w-full h-56 object-cover"
                  />

                  <div className="absolute bottom-3 right-3 bg-black/80 px-3 py-1 rounded-lg text-sm font-semibold">
                    {video.duration}
                  </div>

                </div>

                <div className="p-6">

                  <h2 className="font-bold text-xl line-clamp-2">
                    {video.title}
                  </h2>

                  <p className="text-zinc-400 text-sm mt-2">
                    {new Date(video.publishedAt).toLocaleString()}
                  </p>

                  <div className="mt-6 flex gap-3">

                    <button
                      onClick={() => copy(video.url)}
                      className="flex-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 py-3 font-semibold"
                    >
                      📋 Copy
                    </button>

                    <a
                      href={video.url}
                      target="_blank"
                      className="flex-1 text-center rounded-xl bg-red-600 hover:bg-red-500 py-3 font-semibold"
                    >
                      ▶ Watch
                    </a>

                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>
    </main>
  );
}