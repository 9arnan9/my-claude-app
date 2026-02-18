import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const messages = [];

const chat = () => {
  rl.question("You: ", async (userInput) => {
    if (userInput.toLowerCase() === "exit") {
      console.log("Bye!");
      rl.close();
      return;
    }

    messages.push({ role: "user", content: userInput });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: messages,
    });

    const reply = response.content[0].text;
    messages.push({ role: "assistant", content: reply });

    console.log("Claude:", reply);
    console.log();

    chat();
  });
};

console.log("Start chatting! (type 'exit' to quit)");
chat();