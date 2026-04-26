import "dotenv/config";
import OpenAI from "openai";
import { spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { getLangConfig } from "../shared/language";
import { speak, getTTSProviderName } from "../shared/tts";
import { buildSystemPrompt } from "../shared/prompt";

const openai = new OpenAI();
const lang   = getLangConfig();

type Message = { role: "system" | "user" | "assistant"; content: string };

// ── Sox VAD recording ──────────────────────────────────────────────────────────
function recordUntilSilence(outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const rec = spawn(
      "rec",
      [
        "-r", "16000",
        "-c", "1",
        "-e", "signed-integer",
        "-b", "16",
        outputPath,
        "silence",
        "1", "0.1", "2%",   // start: speech > 2% for 0.1s
        "1", "1.5", "2%",   // stop:  silence < 2% for 1.5s
      ],
      { stdio: "ignore" }
    );
    rec.on("close", () => resolve());
    rec.on("error", reject);
  });
}

function checkSox(): void {
  try {
    require("child_process").execSync("which rec", { stdio: "ignore" });
  } catch {
    console.error("\n[ERROR] sox is not installed. Run: brew install sox\n");
    process.exit(1);
  }
}

// ── Transcribe ─────────────────────────────────────────────────────────────────
async function transcribe(audioPath: string): Promise<string> {
  const transcription = await openai.audio.transcriptions.create({
    file:     fs.createReadStream(audioPath),
    model:    "whisper-1",
    language: lang.whisperCode,
  });
  return transcription.text.trim();
}

// ── Main loop ──────────────────────────────────────────────────────────────────
async function runVoiceAgent(): Promise<void> {
  checkSox();

  const SYSTEM_PROMPT = buildSystemPrompt(lang.name);
  const messages: Message[] = [{ role: "system", content: SYSTEM_PROMPT }];

  console.log("\n╔════════════════════════════════════════╗");
  console.log("║  Tariq — Support Agent Voice Assistant ║");
  console.log("║     Full Duplex  |  Hands-Free          ║");
  console.log("╚════════════════════════════════════════╝");
  console.log(`\n  Language : ${lang.name}`);
  console.log(`  Voice    : ${getTTSProviderName()}`);
  console.log("  Say goodbye in your language to end the call.");
  console.log("  Press Ctrl+C to force quit.\n");

  process.on("SIGINT", () => {
    console.log("\n\nCall ended.\n");
    process.exit(0);
  });

  // Generate opening greeting
  process.stdout.write("Connecting...   \r");
  let greeting: string;
  try {
    const greetingRes = await openai.chat.completions.create({
      model:       "gpt-4o",
      max_tokens:  80,
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: "__GREET__" },
      ],
    });
    greeting = (greetingRes.choices[0].message.content ?? "")
      .replace("[END_CALL]", "")
      .trim();
  } catch (err) {
    console.error("\n[ERROR] Could not generate greeting:", err);
    process.exit(1);
  }

  process.stdout.write("                \r");
  console.log(`Tariq: ${greeting}\n`);
  messages.push({ role: "assistant", content: greeting });
  await speak(greeting);

  await new Promise((r) => setTimeout(r, 300));

  while (true) {
    const audioPath = path.join(os.tmpdir(), `tariq_input_${Date.now()}.wav`);

    process.stdout.write("Listening...\r");
    try {
      await recordUntilSilence(audioPath);
    } catch {
      console.error("\n[ERROR] Recording failed. Is sox installed?");
      continue;
    }

    let fileSize = 0;
    try { fileSize = fs.statSync(audioPath).size; } catch { /* ignore */ }
    if (fileSize < 10000) {
      fs.unlink(audioPath, () => {});
      continue;
    }

    process.stdout.write("                \r");

    process.stdout.write("Transcribing... \r");
    let userText: string;
    try {
      userText = await transcribe(audioPath);
    } catch (err) {
      console.error("\n[ERROR] Transcription failed:", err);
      fs.unlink(audioPath, () => {});
      continue;
    }
    fs.unlink(audioPath, () => {});

    if (!userText) continue;

    console.log(`You:   ${userText}`);
    messages.push({ role: "user", content: userText });

    process.stdout.write("Thinking...     \r");
    let replyText: string;
    try {
      const completion = await openai.chat.completions.create({
        model:       "gpt-4o",
        max_tokens:  200,
        temperature: 0.6,
        messages,
      });
      replyText = completion.choices[0].message.content ?? "";
    } catch (err) {
      console.error("\n[ERROR] GPT-4o failed:", err);
      messages.pop();
      continue;
    }

    if (replyText.startsWith("[END_CALL]")) {
      const bye = replyText.replace("[END_CALL]", "").trim();
      console.log(`Tariq: ${bye}\n`);
      await speak(bye);
      process.exit(0);
    }

    messages.push({ role: "assistant", content: replyText });
    console.log(`Tariq: ${replyText}\n`);

    try {
      await speak(replyText);
    } catch (err) {
      console.error("[WARNING] TTS failed:", err);
    }

    await new Promise((r) => setTimeout(r, 300));
  }
}

runVoiceAgent();
