import OpenAI from "openai";
import { ElevenLabsClient } from "elevenlabs";
import { spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Readable } from "stream";

type Provider = "openai" | "elevenlabs";
type OpenAIVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

const PROVIDER = (process.env.TTS_PROVIDER ?? "openai").toLowerCase() as Provider;
const VOICE    = (process.env.TTS_VOICE    ?? "nova")   as OpenAIVoice;

// ── Playback (macOS afplay) ────────────────────────────────────────────────────
async function playFile(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const player = spawn("afplay", [filePath], { stdio: "ignore" });
    player.on("close", () => { fs.unlink(filePath, () => {}); resolve(); });
    player.on("error", reject);
  });
}

// ── OpenAI TTS ─────────────────────────────────────────────────────────────────
async function speakOpenAI(text: string): Promise<void> {
  const openai = new OpenAI();
  const tmpFile = path.join(os.tmpdir(), `tariq_tts_${Date.now()}.mp3`);

  const response = await openai.audio.speech.create({
    model: "tts-1-hd",
    voice: VOICE,
    input: text,
    speed: 0.95,
  });

  fs.writeFileSync(tmpFile, Buffer.from(await response.arrayBuffer()));
  await playFile(tmpFile);
}

// ── ElevenLabs TTS ─────────────────────────────────────────────────────────────
async function speakElevenLabs(text: string): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is missing in .env. Add it or set TTS_PROVIDER=openai");
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? "pNInz6obpgDQGcFmaJgB";
  const client  = new ElevenLabsClient({ apiKey });
  const tmpFile = path.join(os.tmpdir(), `tariq_tts_${Date.now()}.mp3`);

  const audioStream = await client.textToSpeech.convert(voiceId, {
    text,
    model_id: "eleven_multilingual_v2",
    voice_settings: {
      stability:        0.45,
      similarity_boost: 0.80,
      style:            0.35,
      use_speaker_boost: true,
    },
  });

  await new Promise<void>((resolve, reject) => {
    const writeStream = fs.createWriteStream(tmpFile);
    const readable    = audioStream instanceof Readable
      ? audioStream
      : Readable.fromWeb(audioStream as Parameters<typeof Readable.fromWeb>[0]);
    readable.pipe(writeStream);
    readable.on("error", reject);
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  await playFile(tmpFile);
}

// ── Public API ─────────────────────────────────────────────────────────────────
export async function speak(text: string): Promise<void> {
  if (!text.trim()) return;
  if (PROVIDER === "elevenlabs") return speakElevenLabs(text);
  return speakOpenAI(text);
}

export function getTTSProviderName(): string {
  if (PROVIDER === "elevenlabs") {
    const voiceId = process.env.ELEVENLABS_VOICE_ID ?? "pNInz6obpgDQGcFmaJgB";
    return `ElevenLabs (eleven_multilingual_v2 / voice: ${voiceId})`;
  }
  return `OpenAI tts-1-hd (${VOICE})`;
}
