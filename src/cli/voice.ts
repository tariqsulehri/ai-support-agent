import "dotenv/config";
import OpenAI from "openai";
import { spawn, execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// ── Tenant loader (CLI-side, relative imports only) ───────────────────────────
interface TenantConfig {
  id: string; agentName: string; companyName: string;
  languageMode: string; supportedLanguages?: string[];
  tone: string; ttsProvider: string; ttsVoice: string;
  services: string[]; customInstructions?: string;
  knowledgeBase?: { topic: string; content: string }[];
}

function loadTenant(id?: string): TenantConfig {
  const file = path.resolve(__dirname, "../data/tenants.json");
  const tenants: TenantConfig[] = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!tenants.length) throw new Error("tenants.json is empty");
  if (!id) return tenants[0];
  const found = tenants.find(t => t.id === id);
  if (!found) throw new Error(`Tenant "${id}" not found in tenants.json`);
  return found;
}

function buildSystemPrompt(c: TenantConfig): string {
  const kb = c.knowledgeBase?.length
    ? `## KNOWLEDGE BASE\n\n${c.knowledgeBase.map(e => `**${e.topic}:** ${e.content}`).join("\n\n")}\n\n---`
    : "";
  const custom = c.customInstructions?.trim()
    ? `## CUSTOM INSTRUCTIONS\n\n${c.customInstructions.trim()}\n\n---`
    : "";

  return `
You are ${c.agentName}, a representative of ${c.companyName}.
Detect the user's language and respond in the same language. Tone: ${c.tone}.

${c.companyName} provides: ${c.services.map(s => `\n- ${s}`).join("")}

${kb}

${custom}

Capture lead info (name, email, phone) naturally during conversation.
Append [LEAD:{...}] token each time you collect or update info. Use null for missing fields.
When user is done and you have name+email+phone, respond with [END_CALL] <farewell> [LEAD:{...}]
`.trim();
}

// ── Whisper language code ─────────────────────────────────────────────────────
const WHISPER_CODES: Record<string, string> = {
  english: "en", urdu: "ur", arabic: "ar", hindi: "hi", spanish: "es",
  french: "fr", german: "de", chinese: "zh", japanese: "ja", portuguese: "pt",
  turkish: "tr", russian: "ru", italian: "it", dutch: "nl", korean: "ko",
  bengali: "bn", punjabi: "pa",
};

function getWhisperCode(language: string): string {
  return WHISPER_CODES[language.trim().toLowerCase()] ?? "en";
}

// ── TTS (macOS afplay) ────────────────────────────────────────────────────────
async function speakText(text: string, tenant: TenantConfig): Promise<void> {
  if (!text.trim()) return;

  const openai   = new OpenAI();
  const tmpFile  = path.join(os.tmpdir(), `va_tts_${Date.now()}.mp3`);
  const voice    = (tenant.ttsVoice ?? "nova") as
    "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

  if (tenant.ttsProvider === "elevenlabs") {
    console.warn("[WARN] ElevenLabs TTS not supported in CLI voice mode — using OpenAI.");
  }

  const response = await openai.audio.speech.create({
    model: "tts-1-hd",
    voice,
    input: text,
    speed: 0.95,
  });

  fs.writeFileSync(tmpFile, Buffer.from(await response.arrayBuffer()));

  await new Promise<void>((resolve, reject) => {
    const player = spawn("afplay", [tmpFile], { stdio: "ignore" });
    player.on("close", () => { fs.unlink(tmpFile, () => {}); resolve(); });
    player.on("error", reject);
  });
}

// ── Sox VAD recording ─────────────────────────────────────────────────────────
function recordUntilSilence(outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const rec = spawn(
      "rec",
      [
        "-r", "16000", "-c", "1", "-e", "signed-integer", "-b", "16",
        outputPath,
        "silence", "1", "0.1", "2%", "1", "1.5", "2%",
      ],
      { stdio: "ignore" }
    );
    rec.on("close", () => resolve());
    rec.on("error", reject);
  });
}

function checkSox(): void {
  try {
    execSync("which rec", { stdio: "ignore" });
  } catch {
    console.error("\n[ERROR] sox is not installed. Run: brew install sox\n");
    process.exit(1);
  }
}

// ── Transcribe ────────────────────────────────────────────────────────────────
async function transcribe(audioPath: string, whisperCode?: string): Promise<string> {
  const openai = new OpenAI();
  const result = await openai.audio.transcriptions.create({
    file:  fs.createReadStream(audioPath),
    model: "whisper-1",
    ...(whisperCode ? { language: whisperCode } : {}),
  });
  return result.text.trim();
}

// ── Main ──────────────────────────────────────────────────────────────────────
const tenantId   = process.argv[2] ?? process.env.TENANT_ID;
const tenant     = loadTenant(tenantId);
const whisperCode = tenant.languageMode === 'auto' ? undefined : getWhisperCode(tenant.languageMode);

type Message = { role: "system" | "user" | "assistant"; content: string };

async function runVoiceAgent(): Promise<void> {
  checkSox();

  const SYSTEM_PROMPT = buildSystemPrompt(tenant);
  const messages: Message[] = [{ role: "system", content: SYSTEM_PROMPT }];

  console.log("\n╔════════════════════════════════════════════╗");
  console.log(`║  ${tenant.agentName} @ ${tenant.companyName.padEnd(28)}║`);
  console.log("║  Voice Agent  |  Hands-Free                ║");
  console.log("╚════════════════════════════════════════════╝");
  console.log(`\n  Language : ${tenant.languageMode}`);
  console.log(`  Voice    : ${tenant.ttsProvider} / ${tenant.ttsVoice}`);
  console.log("  Say goodbye to end the call. Ctrl+C to force quit.\n");

  process.on("SIGINT", () => { console.log("\n\nCall ended.\n"); process.exit(0); });

  // Opening greeting
  process.stdout.write("Connecting...   \r");
  let greeting = "";
  try {
    const res = await new OpenAI().chat.completions.create({
      model: "gpt-4o-mini", max_tokens: 80, temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: "__GREET__" },
      ],
    });
    greeting = (res.choices[0].message.content ?? "").replace("[END_CALL]", "").trim();
  } catch (err) {
    console.error("\n[ERROR] Could not generate greeting:", err);
    process.exit(1);
  }

  process.stdout.write("                \r");
  console.log(`${tenant.agentName}: ${greeting}\n`);
  messages.push({ role: "assistant", content: greeting });
  await speakText(greeting, tenant);
  await new Promise(r => setTimeout(r, 300));

  while (true) {
    const audioPath = path.join(os.tmpdir(), `va_input_${Date.now()}.wav`);

    process.stdout.write("Listening...\r");
    try {
      await recordUntilSilence(audioPath);
    } catch {
      console.error("\n[ERROR] Recording failed. Is sox installed?");
      continue;
    }

    let fileSize = 0;
    try { fileSize = fs.statSync(audioPath).size; } catch { /* ignore */ }
    if (fileSize < 10000) { fs.unlink(audioPath, () => {}); continue; }

    process.stdout.write("                \r");
    process.stdout.write("Transcribing... \r");

    let userText = "";
    try {
      userText = await transcribe(audioPath, whisperCode);
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
    let replyText = "";
    try {
      const completion = await new OpenAI().chat.completions.create({
        model: "gpt-4o-mini", max_tokens: 200, temperature: 0.6, messages,
      });
      replyText = completion.choices[0].message.content ?? "";
    } catch (err) {
      console.error("\n[ERROR] GPT-4o failed:", err);
      messages.pop();
      continue;
    }

    if (replyText.startsWith("[END_CALL]")) {
      const bye = replyText.replace("[END_CALL]", "").trim();
      console.log(`${tenant.agentName}: ${bye}\n`);
      await speakText(bye, tenant);
      process.exit(0);
    }

    messages.push({ role: "assistant", content: replyText });
    console.log(`${tenant.agentName}: ${replyText}\n`);

    try {
      await speakText(replyText, tenant);
    } catch (err) {
      console.error("[WARNING] TTS failed:", err);
    }

    await new Promise(r => setTimeout(r, 300));
  }
}

runVoiceAgent();
