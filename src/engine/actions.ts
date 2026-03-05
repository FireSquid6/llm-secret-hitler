import { z } from "zod";
import { ruleEnum } from ".";

// actions to be taken:
// Interaction
// - monarch can highlight players
// - chat
//
// Game:
// - use excalibur TODO
// - assassinate merlin

export const voteActionSchema = z.object({
  kind: z.literal("vote"),
  vote: z.enum(["Approve", "Reject"]),
});
export type VoteAction = z.infer<typeof voteActionSchema>;

export const questActionSchema = z.object({
  kind: z.literal("quest"),
  action: z.enum(["Fail", "Succeed"]),
});
export type QuestAction = z.infer<typeof questActionSchema>;

export const nominateActionSchema = z.object({
  kind: z.literal("nominate"),
  playerIds: z.array(z.string()),
});
export type NominateAction = z.infer<typeof nominateActionSchema>;

export const ladyActionSchema = z.object({
  kind: z.literal("lady"),
  playerId: z.string(),
});
export type LadyAction = z.infer<typeof ladyActionSchema>;

export const assassinateActionSchema = z.object({
  kind: z.literal("assassinate"),
  playerId: z.string(),
});
export type AssassinationAction = z.infer<typeof assassinateActionSchema>;

export const startActionSchema = z.object({
  kind: z.literal("start"),
});
export type StartAction = z.infer<typeof startActionSchema>;

export const rulesetModification = z.object({
  kind: z.literal("ruleset"),
  ruleset: z.array(ruleEnum),
  maxPlayers: z.number(),
});
export type RulesetModifiaction = z.infer<typeof rulesetModification>;

export const abortGameAction = z.object({
  kind: z.literal("abort"),
});
export type AbortGameAction = z.infer<typeof abortGameAction>;

export const leaveGameAction = z.object({
  kind: z.literal("leave"),
});
export type LeaveGameAction = z.infer<typeof leaveGameAction>;

export const gameActionSchema = z.discriminatedUnion("kind", [
  voteActionSchema,
  nominateActionSchema,
  questActionSchema,
  ladyActionSchema,
  assassinateActionSchema,
  startActionSchema,
  rulesetModification,
  abortGameAction,
  leaveGameAction,
]);

export type GameAction = z.infer<typeof gameActionSchema>;
