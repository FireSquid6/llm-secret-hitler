import type { GameState } from ".";
import type { GameAction } from "./actions";
import { performAbortion, performAssassination, performLady, performLeave, performNominate, performQuest, performRulesetModification, performStart, performVote } from "./mutators";

export class ProcessError {
  reason: string | Error;
  type: "client" | "server";

  constructor(type: "client" | "server", reason: unknown) {
    this.type = type;
    if (reason instanceof Error) {
      this.reason = reason;
    } else if (typeof reason === "string") {
      this.reason = reason;
    } else {
      this.reason = `Unknown Error: ${reason}`;
    }
  }
}


export type ProcessResult =
  | ProcessError
  | GameState

export interface ProcessInputs<T extends GameAction | null> {
  state: GameState,
  action: T,
  actorId: string,
}

export function processAction<T extends GameAction>(inputs: ProcessInputs<T>): ProcessResult {
  try {
    const state = structuredClone(inputs.state);
    const actorId = inputs.actorId;
    const action = inputs.action;

    switch (action.kind) {
      case "vote":
        performVote({
          state,
          action,
          actorId,
        });
        break;
      case "lady":
        performLady({
          state,
          action,
          actorId,
        });
        break;
      case "quest":
        performQuest({
          state,
          action,
          actorId,
        });
        break;
      case "start":
        performStart({
          state,
          action,
          actorId,
        });
        break;
      case "nominate":
        performNominate({
          state,
          action,
          actorId,
        });
        break;
      case "assassinate":
        performAssassination({
          state,
          action,
          actorId,
        });
        break;
      case "ruleset":
        performRulesetModification({
          state,
          action,
          actorId,
        });
        break;
      case "abort":
        performAbortion({
          state,
          action,
          actorId,
        });
        break;
      case "leave":
        performLeave({
          state,
          action,
          actorId
        })
        break;
      default:
        throw new Error("Bad action: ", action);
    }

    return state;
  } catch (e) {
    if (e instanceof ProcessError) {
      return e;
    }
    return new ProcessError("server", e);
  }
}
