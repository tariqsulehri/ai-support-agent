import "dotenv/config";
import OpenAI from "openai";
import * as readline from "readline";
import * as path from "path";
import * as fs from "fs";

// ── Tenant loader (CLI-side, relative imports only) ───────────────────────────
interface TenantConfig {
  id: string; agentName: string; companyName: string;
  language: string; tone: string; ttsProvider: string; ttsVoice: string;
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
Respond ONLY in ${c.language}. Tone: ${c.tone}.

${c.companyName} provides: ${c.services.map(s => `\n- ${s}`).join("")}

${kb}

${custom}

Capture lead info (name, email, phone) naturally during conversation.
Append [LEAD:{...}] token each time you collect or update info. Use null for missing fields.
When user is done and you have name+email+phone, respond with [END_CALL] <farewell> [LEAD:{...}]
`.trim();
}

// ── Main ──────────────────────────────────────────────────────────────────────
const tenantId = process.argv[2] ?? process.env.TENANT_ID;
const tenant   = loadTenant(tenantId);

const openai = new OpenAI();

type Message = { role: "system" | "user" | "assistant"; content: string };

async function runTextAgent(): Promise<void> {
  const SYSTEM_PROMPT = buildSystemPrompt(tenant);
  const messages: Message[] = [{ role: "system", content: SYSTEM_PROMPT }];

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  console.log(`\n${tenant.agentName} @ ${tenant.companyName}  (lang: ${tenant.language})`);
  console.log('Type your message and press Enter. Type "exit" to quit.\n');

  while (true) {
    const userInput = await question("You: ");

    if (userInput.trim().toLowerCase() === "exit") {
      console.log("Goodbye.");
      rl.close();
      break;
    }

    if (!userInput.trim()) continue;

    messages.push({ role: "user", content: userInput });

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 512,
        messages,
      });

      const replyText = completion.choices[0].message.content ?? "";
      messages.push({ role: "assistant", content: replyText });
      console.log(`\n${tenant.agentName}: ${replyText}\n`);
    } catch (err) {
      console.error("[ERROR]", err);
      messages.pop();
    }
  }
}

runTextAgent();
