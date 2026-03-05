import type { GameState, Quest, Role, Rule, Player, Knowledge } from ".";
import { playerCounts, questInfo } from "./data";
import { ProcessError } from "./process";

export function validateRuleset(ruleset: Rule[], playerCount: number): string | true {
  if (hasDuplicates(ruleset)) {
    return `Ruleset has duplicate rules. All rules should be unique`;
  }

  if (playerCount > 10 || playerCount < 5) {
    return `Need a player amount between 5 and 10 (inclusive), got ${playerCount}`;
  }
  let maxEvilPlayers = 0;

  switch (playerCount) {
    case 5:
    case 6:
      maxEvilPlayers = 2;
      break;
    case 7:
    case 8:
      maxEvilPlayers = 3;
      break;
    case 9:
    case 10:
      maxEvilPlayers = 4;
      break;
  }

  const maxGoodPlayers = playerCount - maxEvilPlayers;

  // both start at 1 since merlin and assassin are always required
  let requiredGoodPlayers = 1;
  let requiredEvilPlayers = 1;

  for (const rule of ruleset) {
    // don't need to do anything else for other rules
    switch (rule) {
      case "Oberon":
      case "Mordred":
        requiredEvilPlayers += 1;
        break;
      case "Percival and Morgana":
        requiredEvilPlayers += 1;
        requiredGoodPlayers += 1;
        break;
    }
  }

  if (requiredEvilPlayers > maxEvilPlayers) {
    return `${requiredEvilPlayers} evil players needed for this ruleset, but only ${maxEvilPlayers} available`
  }
  if (requiredGoodPlayers > maxGoodPlayers) {
    return `${requiredGoodPlayers} good players needed for this ruleset, but only ${maxGoodPlayers} available`
  }

  return true;
}

function hasDuplicates<T>(l: T[]): boolean {
  const set = new Set<T>();

  for (const t of l) {
    if (set.has(t)) {
      return true;
    }
    set.add(t);
  }
  return false;
}


export function getQuestInformation(players: number): Quest[] {
  const quests = questInfo[players];

  if (quests === undefined) {
    throw new Error(`Tried to get quest info for ${players} players`);
  }

  return quests;
}

export function getGoodEvilNumber(players: number): { good: number, evil: number } {
  const res = playerCounts[players];

  if (res === undefined) {
    throw new Error(`Tried to get good and evil number for ${players} players`);
  }

  return res;
}

export function getRolesForRuleset(ruleset: Rule[], playerCount: number): Role[] {
  let { good: goodRemaining, evil: evilRemaining } = getGoodEvilNumber(playerCount);
  const roles: Role[] = [];

  roles.push("Merlin");
  roles.push("Assassin");
  goodRemaining -= 1;
  evilRemaining -= 1;

  for (const rule of ruleset) {
    switch (rule) {
      case "Oberon":
        roles.push("Oberon");
        evilRemaining -= 1;
        break;
      case "Mordred":
        roles.push("Mordred");
        evilRemaining -= 1;
        break;
      case "Percival and Morgana":
        roles.push("Percival");
        roles.push("Morgana");
        evilRemaining -= 1;
        goodRemaining -= 1;
        break;
    }
  }

  while (goodRemaining > 0) {
    roles.push("Arthurian Servant");
    goodRemaining -= 1;
  }

  while (evilRemaining > 0) {
    roles.push("Mordredic Servant");
    evilRemaining -= 1;
  }

  if (roles.length !== playerCount) {
    throw new Error(`Super screwed! Allocated ${roles.length} roles for a ${playerCount} player game!`);
  }

  return roles;
}

export function getBlankState(id: string, gameMasterId: string, ruleset: Rule[], maxPlayers: number, password?: string): GameState {
  return {
    id,
    status: "waiting",
    players: [],
    tableOrder: [],
    ruleset,
    password,
    timeset: {
      nominate: maxPlayers * 60000,
      assassinate: Math.ceil((maxPlayers - 3) / 2) * 60000,
      vote: 120000,
      lady: maxPlayers * 60000,
      quest: 120000,
    },
    timeoutTime: undefined,
    expectedPlayers: maxPlayers,
    gameMaster: gameMasterId,
    rounds: [],
    hiddenRoles: {},
  }
}

export function insertPlayer(state: GameState, player: Player) {
  state.players.push(player);
  state.tableOrder.push(player.id);
}

type IntendedAction = "vote" | "nominate" | "quest" | "lady" | "start" | "assassinate" | "complete" | "none";
export function getNextIntendedAction(state: GameState): IntendedAction {
  if (state.status === "waiting") {
    return "start";
  }
  if (state.status === "finished") {
    return "none";
  }

  const currentRound = state.rounds[state.rounds.length - 1];

  if (currentRound === undefined) {
    throw new ProcessError("server", "In situation where there should be a round but isn't");
  }

  if (!currentRound.nominatedPlayers) {
    return "nominate";
  }


  if (Object.keys(currentRound.votes).length < state.players.length) {
    return "vote";
  }

  if (!currentRound.quest || !currentRound.quest.completed) {
    return "quest";
  }

  const questNumber = currentRound.questNumber;
  const needsToUseLady = rulesetHas(state.ruleset, "Lady of the Lake")
    && questNumber >= 2
    && questNumber <= 4
    && currentRound.ladyTarget === undefined

  if (needsToUseLady) {
    return "lady";
  }

  // quest five is done
  if (currentRound.questNumber === 5) {
    // quest 5 is over, game is done
    if (rulesetHas(state.ruleset, "Quickshot Assassin")) {
      return "complete";
    } else {
      return "assassinate";
    }
  }

  throw new ProcessError("server", "Game state is such that no action can be taken");

}

export function rulesetHas(ruleset: Rule[], rule: Rule): boolean {
  return ruleset.find((r) => r === rule) !== undefined;
}


export function newRound(state: GameState) {
  if (state.rounds.length === 0) {
    state.rounds.push(
      {
        monarch: state.tableOrder[0]!,
        questNumber: 1,

        votes: {},
      }
    );
    return;
  }

  const lastRound = state.rounds[state.rounds.length - 1]!;
  const monarchIndex = state.rounds.length % state.players.length;
  const didLastRound = lastRound.quest !== undefined;

  state.rounds.push({
    monarch: state.tableOrder[monarchIndex]!,
    questNumber: didLastRound ? lastRound.questNumber + 1 : lastRound.questNumber,

    votes: {},
  });
}

export function getFailedVotes(state: GameState): number {
  let failed: number = 0;

  for (const round of state.rounds) {
    const voted = Object.keys(round.votes).length === state.players.length;
    if (!voted) {
      continue;
    }

    const requiredApproves = Math.ceil(state.players.length / 2);
    let approves: number = 0;
    for (const r of Object.values(round.votes)) {
      if (r === "Approve") {
        approves += 1;
      }

    }

    if (approves < requiredApproves) {
      failed += 1;
    }
  }
  return failed;
}

export function getScore(state: GameState): { fails: number, passes: number } {
  let fails: number = 0;
  let passes: number = 0;

  const quests = getQuestInformation(state.players.length);

  for (const round of state.rounds) {
    if (!round.quest) {
      continue;
    }
    const questInfo = quests[round.questNumber - 1]!;
    if (round.quest.failCards >= questInfo.failsRequired) {
      fails += 1;
    } else {
      passes += 1;
    }
  }

  return {
    fails,
    passes,
  }
}

export function generateKnowledgeMap(state: GameState) {
  const showTeammateRoles = rulesetHas(state.ruleset, "Visible Teammate Roles");
  const knowledgeMap: Record<string, Knowledge[]> = {};

  for (const player of Object.keys(state.hiddenRoles)) {
    const role = state.hiddenRoles[player];
    const knowledge: Knowledge[] = [];

    switch (role) {
      case "Mordredic Servant":
      case "Assassin":
      case "Mordred":
      case "Morgana":
        for (const p of Object.keys(state.hiddenRoles)) {
          const r = state.hiddenRoles[p];

          if (r === "Assassin" || r === "Mordred" || r === "Morgana" || r === "Mordredic Servant") {
            if (showTeammateRoles) {
              knowledge.push({
                playerId: p,
                source: "initial",
                info: {
                  type: "role",
                  role: r,
                }
              });
            } else {
              knowledge.push({
                playerId: p,
                source: "initial",
                info: {
                  type: "team",
                  team: "Mordredic",
                }
              });
            }
          }
        }
        break;
      case "Percival":
        for (const p of Object.keys(state.hiddenRoles)) {
          const r = state.hiddenRoles[p];

          if (r === "Merlin" || r === "Morgana") {
            knowledge.push({
              playerId: p,
              source: "initial",
              info: {
                type: "percivalic sight",
              },
            });
          }
        }
        break;
      case "Merlin":
        for (const p of Object.keys(state.hiddenRoles)) {
          const r = state.hiddenRoles[p];

          if (r === "Morgana" || r === "Assassin" || r === "Oberon" || r === "Mordredic Servant") {
            knowledge.push({
              playerId: p,
              source: "initial",
              info: {
                type: "team",
                team: "Mordredic",
              },
            });
          }

        }
        break;
    }

    knowledge.filter((k) => k.playerId !== player)

    knowledge.push({
      playerId: player,
      source: "initial",
      info: {
        type: "role",
        role: state.hiddenRoles[player]!,
      }
    })

    shuffleArray(knowledge);
    knowledgeMap[player] = knowledge;
  }


  for (const round of state.rounds) {
    if (round.ladyTarget === undefined || round.ladyUser === undefined) {
      continue;
    }

    const role = state.hiddenRoles[round.ladyTarget]!;
    const team = getTeam(role);
    
    // this may result in duplicates (i.e. an evil player investigates their own teammate)
    // this is intentional, as it allows the player an indication that they did actually
    // "use" the lady of the lake, even though it gives the same information
    knowledgeMap[round.ladyUser]!.push({
      playerId: round.ladyTarget,
      source: "lady",
      info: {
        type: "team",
        team: team,
      }
    });
  }

  return knowledgeMap
}

export function shuffleArray<T>(array: T[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j]!, array[i]!]; // Swap elements
  }
  return array;
}


export function getTeam(role: Role): "Mordredic" | "Arthurian" {
  switch (role) {
    case "Oberon":
    case "Mordred":
    case "Mordredic Servant":
    case "Assassin":
    case "Morgana":
      return "Mordredic";
    case "Merlin":
    case "Percival":
    case "Arthurian Servant":
      return "Arthurian";
  }
}
