import { z } from "zod";

// type alias for code readability purposes


export const ruleEnum = z.enum([
  "Lady of the Lake",
  "Oberon",
  "Morgause",
  "Mordred",
  "Percival and Morgana",
  "Excalibur",
  "Quickshot Assassin",
  "Visible Teammate Roles",
  "Lancelot",
  "Targeting",
  "Clock",
]);
export type Rule = z.infer<typeof ruleEnum>;

export const roleEnum = z.enum([
  "Merlin",
  "Percival",
  "Arthurian Servant",
  "Mordred",
  "Assassin",
  "Morgana",
  "Oberon",
  "Mordredic Servant",
]);
export type Role = z.infer<typeof roleEnum>;

export const playerSchema = z.object({
  id: z.string(),
  displayName: z.string(),
});
export type Player = z.infer<typeof playerSchema>;


export const roundSchema = z.object({
  monarch: z.string(), // playerId of monarch
  questNumber: z.number(),
  ladyTarget: z.optional(z.string()),
  ladyUser: z.optional(z.string()),
  nominatedPlayers: z.optional(z.array(z.string())),

  votes: z.record(z.string(), z.enum(["Approve", "Reject"])),

  quest: z.optional(z.object({
    failCards: z.number(),
    successCards: z.number(),
    questedPlayers: z.array(z.string()),
    completed: z.boolean(),
  })),
})

export type Round = z.infer<typeof roundSchema>;

export const timesetSchema = z.object({
  nominate: z.number(),
  lady: z.number(),
  quest: z.number(),
  vote: z.number(),
  assassinate: z.number(),
});
export type Timeset = z.infer<typeof timesetSchema>;

export const gameStateSchema = z.object({
  id: z.string(),
  status: z.enum(["in-progress", "finished", "waiting"]),
  players: z.array(playerSchema),
  expectedPlayers: z.number(),
  password: z.optional(z.string()),
  tableOrder: z.array(z.string()),  // first playerId is the starting monarch
  ladyHolder: z.optional(z.string()),

  gameMaster: z.string(),
  ruleset: z.array(ruleEnum),
  // time in milliseconds for each task
  timeset: timesetSchema,
  timeoutTime: z.optional(z.number()),
  rounds: z.array(roundSchema),
  // Arthurian Victory - three quest passes 
  // Assassination Failure - assassination attempted mid-round (hot assassin) but missed
  // Mordredic Victory - three quest fails
  // Asassination - Successful mid-round assassination
  // Deadlock - too many failed votes
  result: z.optional(z.enum(["Arthurian Victory", "Mordredic Victory", "Assassination", "Deadlock", "Aborted"])),

  // hidden roles are not provided to the client unless the game is over
  hiddenRoles: z.record(z.string(), roleEnum),

  assassinationTarget: z.optional(z.string()),
});
export type GameState = z.infer<typeof gameStateSchema>;

export interface GameInfo {
  id: string;
  requiresPassword: boolean;
  currentPlayers: number;
  maxPlayers: number;
  ruleset: Rule[];
  gameMaster: string;
  status: "in-progress" | "finished" | "waiting";
}

// knowledge given to a specific player
export const knowledgeSchema = z.object({
  playerId: z.string(),
  source: z.enum(["lady", "initial"]),
  info: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("team"),
      team: z.enum(["Mordredic", "Arthurian"]),
    }),
    z.object({
      type: z.literal("role"),
      role: roleEnum,
    }),
    z.object({
      type: z.literal("percivalic sight"),
    })
  ])
});
export type Knowledge = z.infer<typeof knowledgeSchema>;

export interface Quest {
  players: number;
  failsRequired: number;
}

export function getRuleDescriptoin(rule: Rule): string {
  switch (rule) {
    case "Clock":
      return "Adds a timer to the game to avoid infinite filibusters";
    case "Oberon":
      return "Adds Oberon. Oberon acts as a nerfed evil player who is unknown to and doesn't know his own teammates";
    case "Mordred":
      return "Adds Mordred. Mordred is an evil player unknown to Merlin";
    case "Lancelot":
      return "Not implemented";
    case "Morgause":
      return "Morgause is used at the beginning of the game by Assassin to rearrange the table";
    case "Excalibur":
      return "Excalibur is used to flip a specific quest result";
    case "Targeting":
      return "Quests can be done in any order";
    case "Lady of the Lake":
      return "The lady of the lake allows someone to see the true team of another player";
    case "Quickshot Assassin":
      return "The assassin can attack Merlin at any point, and must do so before the conclusion of the final round. Recommended for experienced players";
    case "Percival and Morgana":
      return "Adds Percival, who must distinguish between Merlin and Morgana to discover the truth";
    case "Visible Teammate Roles":
      return "Evil players know the exact roles of their teammates";
  }

}
