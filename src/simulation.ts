import { generateText, tool, stepCountIs } from "ai";
import type { ToolSet } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { GameState, Knowledge } from "./engine";
import type { ChatMessage } from "./game";
import { AvalonGame } from "./game";
import { buildSystemPrompt, describeGameState } from "./prompts";
import { questInfo } from "./engine/data";

const playerNames = [
  "Andrew",
  "Lainey",
  "Peter",
  "Henry",
  "Eleanor",
  "Phoebe",
  "Alexandra",
  "Nolan",
];

interface StateUpdate {
  state: GameState;
  knowledge: Knowledge[];
  actions: string[];
  recentMessages: ChatMessage[];
}

class AvalonAgent {
  private chatBuffer: ChatMessage[] = [];
  private stateQueue: StateUpdate[] = [];
  private isProcessing = false;
  private systemPrompt = "";

  constructor(
    private playerName: string,
    private game: AvalonGame,
    private allPlayers: string[],
  ) {}

  onChatMessage(msg: ChatMessage): void {
    this.chatBuffer.push(msg);
  }

  async onStateUpdate(
    state: GameState,
    knowledge: Knowledge[],
    actions: string[],
  ): Promise<void> {
    const recentMessages = [...this.chatBuffer];
    this.chatBuffer = [];

    this.systemPrompt = buildSystemPrompt(
      this.playerName,
      knowledge,
      state.players.length,
      this.allPlayers,
    );

    this.stateQueue.push({ state, knowledge, actions, recentMessages });

    // If already processing, the queued item will be picked up by the running drainQueue loop
    if (!this.isProcessing) {
      await this.drainQueue();
    }
  }

  private async drainQueue(): Promise<void> {
    this.isProcessing = true;
    try {
      while (this.stateQueue.length > 0) {
        const update = this.stateQueue.shift()!;
        await this.processUpdate(update);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private buildTools(state: GameState, actions: string[]): ToolSet {
    const playerList = state.players.map((p) => p.id);

    const tools: ToolSet = {
      send_chat_message: tool({
        description: "Send a message visible to all other players at the table",
        inputSchema: z.object({
          message: z.string().describe("The message to send"),
        }),
        execute: async ({ message }) => {
          console.log(`[${this.playerName}] chat: ${message}`);
          await this.game.sendChatMessage(this.playerName, message);
          return "Message sent";
        },
      }),
    };

    if (actions.includes("nominate")) {
      const currentRound = state.rounds[state.rounds.length - 1];
      const questNum = currentRound?.questNumber ?? 1;
      const questConfig = questInfo[state.players.length]?.[questNum - 1];
      const needed = questConfig?.players ?? 3;

      tools.nominate = tool({
        description: `Nominate exactly ${needed} players for Quest ${questNum}. As monarch, you must select the quest team.`,
        inputSchema: z.object({
          playerIds: z
            .array(z.string())
            .describe(
              `Exactly ${needed} player IDs to send on the quest. Players: ${playerList.join(", ")}`,
            ),
        }),
        execute: async ({ playerIds }) => {
          console.log(
            `[${this.playerName}] nominates: ${playerIds.join(", ")}`,
          );
          try {
            await this.game.performAction(this.playerName, {
              kind: "nominate",
              playerIds,
            });
            return `Nominated ${playerIds.join(", ")} for the quest`;
          } catch (e) {
            return `Nomination failed: ${e}`;
          }
        },
      });
    }

    if (actions.includes("vote")) {
      tools.vote = tool({
        description:
          "Cast your vote to Approve or Reject the currently nominated team",
        inputSchema: z.object({
          vote: z.enum(["Approve", "Reject"]).describe("Your vote"),
        }),
        execute: async ({ vote }) => {
          console.log(`[${this.playerName}] votes: ${vote}`);
          try {
            await this.game.performAction(this.playerName, {
              kind: "vote",
              vote,
            });
            return `Voted ${vote}`;
          } catch (e) {
            return `Vote failed: ${e}`;
          }
        },
      });
    }

    if (actions.includes("quest")) {
      tools.go_on_quest = tool({
        description:
          "Play your quest card. Good players must play Succeed. Evil players may choose Fail to sabotage.",
        inputSchema: z.object({
          action: z.enum(["Succeed", "Fail"]).describe("Your quest card"),
        }),
        execute: async ({ action }) => {
          console.log(`[${this.playerName}] quest card: ${action}`);
          try {
            await this.game.performAction(this.playerName, {
              kind: "quest",
              action,
            });
            return `Played ${action}`;
          } catch (e) {
            return `Quest action failed: ${e}`;
          }
        },
      });
    }

    if (actions.includes("lady")) {
      const others = playerList
        .filter((id) => id !== this.playerName)
        .join(", ");
      tools.use_lady_of_lake = tool({
        description:
          "Use the Lady of the Lake to secretly learn another player's team alignment (Arthurian or Mordredic)",
        inputSchema: z.object({
          playerId: z
            .string()
            .describe(`Player to investigate: ${others}`),
        }),
        execute: async ({ playerId }) => {
          console.log(`[${this.playerName}] lady of the lake: ${playerId}`);
          try {
            await this.game.performAction(this.playerName, {
              kind: "lady",
              playerId,
            });
            return `Used Lady of the Lake on ${playerId}`;
          } catch (e) {
            return `Lady of the Lake failed: ${e}`;
          }
        },
      });
    }

    if (actions.includes("assassinate")) {
      const others = playerList
        .filter((id) => id !== this.playerName)
        .join(", ");
      tools.assassinate = tool({
        description:
          "As the Assassin, identify and kill Merlin. If you choose correctly, Mordredics win. You have one chance.",
        inputSchema: z.object({
          playerId: z
            .string()
            .describe(`Player to assassinate: ${others}`),
        }),
        execute: async ({ playerId }) => {
          console.log(`[${this.playerName}] assassinates: ${playerId}`);
          try {
            await this.game.performAction(this.playerName, {
              kind: "assassinate",
              playerId,
            });
            return `Assassinated ${playerId}`;
          } catch (e) {
            return `Assassination failed: ${e}`;
          }
        },
      });
    }

    return tools;
  }

  private async processUpdate(update: StateUpdate): Promise<void> {
    const { state, actions, recentMessages } = update;

    if (state.status === "finished") {
      console.log(`[${this.playerName}] game over — ${state.result}`);
      return;
    }

    // Skip if nothing requires a response
    if (actions.length === 0 && recentMessages.length === 0) {
      return;
    }

    const stateDescription = describeGameState(state, actions, recentMessages);
    const tools = this.buildTools(state, actions);

    try {
      const result = await generateText({
        model: anthropic("claude-haiku-4-5-20251001"),
        system: this.systemPrompt,
        messages: [{ role: "user", content: stateDescription }],
        tools,
        stopWhen: stepCountIs(6),
      });

      if (result.text.trim()) {
        console.log(
          `[${this.playerName}] (thinking) ${result.text.trim().slice(0, 400)}`,
        );
      }
    } catch (e) {
      console.error(`[${this.playerName}] generateText error:`, e);
    }
  }
}

export async function simulateAvalonGame() {
  const game = new AvalonGame();

  for (const playerName of playerNames) {
    game.addPlayer(playerName);
    const agent = new AvalonAgent(playerName, game, playerNames);

    game.onStateUpdate(playerName, (state, knowledge, actions) =>
      agent.onStateUpdate(state, knowledge, actions),
    );
    game.onChatMessage(playerName, (msg) => agent.onChatMessage(msg));
  }

  console.log(`Starting Avalon simulation with ${playerNames.length} players`);
  await game.startGame();
  console.log("Game simulation complete");
}
