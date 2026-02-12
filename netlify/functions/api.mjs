import Groq from "groq-sdk";
import { YoutubeTranscript } from "youtube-transcript";

const MEM0_API_BASE = "https://api.mem0.ai";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

async function mem0Search(apiKey, query, userId) {
  const res = await fetch(`${MEM0_API_BASE}/v2/memories/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Token ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      filters: { user_id: userId },
      top_k: 10,
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : data.results || [];
}

async function mem0Add(apiKey, messages, userId) {
  await fetch(`${MEM0_API_BASE}/v1/memories/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Token ${apiKey}`,
    },
    body: JSON.stringify({
      user_id: userId,
      messages,
    }),
  });
}

async function fetchYoutubeTranscript(videoId) {
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    return items.map((t) => t.text).join(" ");
  } catch (e) {
    console.error("YouTube transcript error:", e);
    return null;
  }
}

const YOUTUBE_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/;

async function handleChat(body, groqClient, mem0ApiKey) {
  const message = body.message || "";
  const selectedModels = body.models || [];
  const user_id = body.user_id || "default_user";

  if (!message) return jsonResponse({ error: "Message is required" }, 400);
  if (!selectedModels.length)
    return jsonResponse({ error: "No models selected" }, 400);

  const ytMatch = message.match(YOUTUBE_REGEX);
  if (ytMatch) {
    const videoId = ytMatch[1];
    const transcript = await fetchYoutubeTranscript(videoId);
    if (!transcript)
      return jsonResponse({ error: "Failed to retrieve transcript" }, 500);

    const summarizationPrompt = `Summarize the key points of this YouTube video transcript:\n\n${transcript}`;
    const responses = [];
    for (const model of selectedModels) {
      const completion = await groqClient.chat.completions.create({
        messages: [{ role: "user", content: summarizationPrompt }],
        model,
      });
      const responseText = completion.choices[0].message.content;
      responses.push({
        model,
        response: responseText,
        retrieved_memory: [],
      });
    }
    return jsonResponse(responses);
  }

  const pastMemories = await mem0Search(mem0ApiKey, message, user_id);
  const history = [];
  const retrievedMemory = [];
  if (pastMemories && pastMemories.length) {
    for (const mem of pastMemories) {
      const score = mem.score ?? 1;
      if (score > 0.25) {
        const memoryText = mem.memory || mem.data?.memory;
        if (memoryText) {
          history.push({
            role: "system",
            content: `(Memory) ${memoryText}`,
          });
          retrievedMemory.push(memoryText);
        }
      }
    }
  }
  history.push({ role: "user", content: message });

  const responses = [];
  for (const model of selectedModels) {
    const completion = await groqClient.chat.completions.create({
      messages: history,
      model,
    });
    const responseText = completion.choices[0].message.content;
    responses.push({
      model,
      response: responseText,
      retrieved_memory: retrievedMemory,
    });
    await mem0Add(
      mem0ApiKey,
      [
        { role: "user", content: message },
        { role: "assistant", content: responseText },
      ],
      user_id
    );
  }
  return jsonResponse(responses);
}

async function handleYoutubeTranscript(body) {
  const videoId = body.videoId;
  if (!videoId)
    return jsonResponse({ error: "Invalid YouTube video ID" }, 400);
  const transcript = await fetchYoutubeTranscript(videoId);
  if (transcript) return jsonResponse({ transcript });
  return jsonResponse({ error: "Failed to retrieve transcript" }, 500);
}

export default async (req, context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const groqKey = Netlify.env.get("GROQ_API_KEY");
  const mem0Key = Netlify.env.get("MEM0_API_KEY");
  if (!groqKey || !mem0Key) {
    return jsonResponse(
      { error: "Server missing GROQ_API_KEY or MEM0_API_KEY" },
      500
    );
  }

  const groqClient = new Groq({ apiKey: groqKey });
  const pathname = new URL(req.url || req.headers.get("x-url") || "/").pathname;

  let body = {};
  if (req.method === "POST") {
    try {
      body = await req.json();
    } catch (_) {}
  }

  try {
    if (pathname === "/api/chat" && req.method === "POST") {
      return await handleChat(body, groqClient, mem0Key);
    }
    if (pathname === "/api/youtube-transcript" && req.method === "POST") {
      return await handleYoutubeTranscript(body);
    }
    return jsonResponse({ error: "Not found" }, 404);
  } catch (e) {
    console.error("API error:", e);
    return jsonResponse({ error: String(e.message || e) }, 500);
  }
};

export const config = {
  path: ["/api/chat", "/api/youtube-transcript"],
};
