import "dotenv/config";
import OpenAI from "openai";
import * as readline from "readline";
import { buildSystemPrompt } from "../shared/prompt";
import { getLangConfig } from "../shared/language";

const openai = new OpenAI();
const lang   = getLangConfig();

type Message = { role: "system" | "user" | "assistant"; content: string };

async function runTextAgent(): Promise<void> {
  const SYSTEM_PROMPT = buildSystemPrompt(lang.name);
  const messages: Message[] = [{ role: "system", content: SYSTEM_PROMPT }];

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  console.log(`\nTariq — Support Agent Text Agent  (Language: ${lang.name})`);
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
        model:      "gpt-4o",
        max_tokens: 512,
        messages,
      });

      const replyText = completion.choices[0].message.content ?? "";
      messages.push({ role: "assistant", content: replyText });
      console.log(`\nTariq: ${replyText}\n`);
    } catch (err) {
      console.error("[ERROR]", err);
      messages.pop();
    }
  }
}

runTextAgent();
