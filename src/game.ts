import type { GameState, Knowledge } from "./engine";
import type { GameAction } from "./engine/actions";
import { generateKnowledgeMap, getAvailableActions, getBlankState, insertPlayer } from "./engine/logic";
import { processAction, ProcessError } from "./engine/process";
import { viewStateAs } from "./engine/view";

export type GameListener = (state: GameState, knowledge: Knowledge[], nextActions: string[]) => void | Promise<void>;
export type ChatListener = (message: ChatMessage) => void | Promise<void>;

export interface ChatMessage {
  time: Date;
  playerName: string;
  message: string;
}

export class AvalonGame {
  private gameListeners: [GameListener, string][] = [];
  private chatListeners: [ChatListener, string][] = [];
  private state;
  private messages: ChatMessage[] = []; 

  constructor() {
    this.state = getBlankState(
      "game",
      "gameMasterUser", 
      ["Mordred", "Percival and Morgana", "Lady of the Lake"],
      8,
    );
  }

  addPlayer(name: string) {
    insertPlayer(this.state, {
      id: name,
      displayName: name,
    });
  }

  async startGame() {
    const result = processAction({
      state: this.state,
      action: {
        kind: "start"
      },
      actorId: "gameMasterUser",
    })

    if (result instanceof ProcessError) {
      throw new Error(`Failed to start game: ${result.type} - ${result.reason}`);
    }

    this.state = result;
    await this.updateStateListeners();

  }

  onStateUpdate(player: string, listener: GameListener): () => void {
    this.gameListeners.push([listener, player]);

    return () => {
      this.gameListeners.filter(([l, _]) => l !== listener);
    }
  }

  onChatMessage(player: string, listener: ChatListener) {
    this.chatListeners.push([listener, player]);

    return () => {
      this.chatListeners.filter(([l, _]) => l !== listener);
    }
  }


  private async updateStateListeners() {
    const promises: Promise<any>[] = [];

    for (const [l, n] of this.gameListeners) {
      const view = viewStateAs(this.state, n);
      const knowledge = generateKnowledgeMap(this.state);

      if (!knowledge[n]) {
        throw new Error(`Knowledge map does not include ${n}`);
      }

      const actions = getAvailableActions(view, knowledge[n], n);

      const res = l(view, knowledge[n], actions);
      if (res instanceof Promise) {
        promises.push(res);
      }
    }

    await Promise.all(promises);
  }

  private async updateChatListeners(message: ChatMessage) {
    const promises: Promise<any>[] = [];

    for (const [l, n] of this.chatListeners){
      if (n !== message.playerName) {
        const res = l(message);

        if (res instanceof Promise) {
          promises.push(res);
        }
      }
    }

    await Promise.all(promises);
  }

  async performAction(player: string, action: GameAction) {
    const result = processAction({
      state: this.state,
      action: action,
      actorId: player,
    });

    if (result instanceof ProcessError) {
      throw new Error(`Issue performing action: ${result.type} - ${result.reason}`);
    }

    this.state = result;

    await this.updateStateListeners();
  }

  async sendChatMessage(player: string, message: string) {
    const msg: ChatMessage = {
      playerName: player,
      message,
      time: new Date(),

    }

    this.messages.push(msg);
    await this.updateChatListeners(msg);
  }
}
