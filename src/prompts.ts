import type { GameState, Knowledge } from "./engine";
import type { ChatMessage } from "./game";
import { questInfo } from "./engine/data";

const teamCounts: Record<number, { good: number; evil: number }> = {
  5: { good: 3, evil: 2 },
  6: { good: 4, evil: 2 },
  7: { good: 4, evil: 3 },
  8: { good: 5, evil: 3 },
  9: { good: 5, evil: 4 },
  10: { good: 6, evil: 4 },
};

export function buildSystemPrompt(
  playerName: string,
  knowledge: Knowledge[],
  totalPlayers: number,
  allPlayers: string[],
): string {
  const knowledgeLines: string[] = [];
  for (const k of knowledge) {
    const source =
      k.source === "lady" ? " (revealed by Lady of the Lake)" : "";
    if (k.info.type === "team") {
      if (k.playerId === playerName) {
        knowledgeLines.push(`- You are on the ${k.info.team} team${source}`);
      } else {
        knowledgeLines.push(
          `- ${k.playerId} is on the ${k.info.team} team${source}`,
        );
      }
    } else if (k.info.type === "role") {
      if (k.playerId === playerName) {
        knowledgeLines.push(`- Your role is: ${k.info.role}${source}`);
      } else {
        knowledgeLines.push(
          `- ${k.playerId}'s role is ${k.info.role}${source}`,
        );
      }
    } else if (k.info.type === "percivalic sight") {
      knowledgeLines.push(
        `- ${k.playerId} has a magical aura — they are either Merlin or Morgana${source}`,
      );
    }
  }

  const questData = questInfo[totalPlayers] ?? questInfo[8]!;
  const questTable = questData
    .map(
      (q, i) =>
        `  Quest ${i + 1}: ${q.players} players, fails if ${q.failsRequired}+ Fail card${q.failsRequired > 1 ? "s are" : " is"} played`,
    )
    .join("\n");

  const counts = teamCounts[totalPlayers] ?? { good: 5, evil: 3 };

  return `You are ${playerName}, a player in a game of Avalon.

## Avalon Rules

Avalon is a social deduction game. Players are secretly divided:
- Arthurian team (${counts.good} players): good players trying to complete quests
- Mordredic team (${counts.evil} players): evil players trying to sabotage quests

Victory conditions:
- Arthurians win: 3 quests succeed
- Mordredics win: 3 quests fail, OR the Assassin correctly kills Merlin after losing

Round flow:
1. All players discuss who should go on the quest by using the chat. The current monarch is the defacto moderator for this discussion and can end it every time.
2. The Monarch (rotating leader) nominates players for a quest team
3. All players vote Approve or Reject on the nominated team
4. If majority Approve, the team goes on the quest; otherwise leadership passes clockwise
5. If 5 nominations in a row are rejected, Mordredics win automatically
6. Quest team members secretly play Success or Fail cards
7. If enough Fail cards are played, the quest fails; otherwise it succeeds
8. After 3 Arthurian quest wins: the Assassin attempts to identify and kill Merlin

Active special rules:
- Mordred: an evil player who is invisible to Merlin
- Percival and Morgana: Percival sees who Merlin and Morgana are, but cannot distinguish them
- Lady of the Lake: after each quest, the Lady token holder may investigate another player's team

Quest requirements (${totalPlayers} players):
${questTable}

## Players at the table
${allPlayers.join(", ")}

## Your secret knowledge
${knowledgeLines.length > 0 ? knowledgeLines.join("\n") : "- No special knowledge beyond what is publicly visible"}

## How to play
- Your text output is your private internal monologue — other players cannot see it
- Use the send_chat_message tool to communicate with other players
- Use action tools (vote, nominate, etc.) when it is your turn to act
- Good players: build trust, identify evil players, and protect Merlin's identity
- Evil players: appear trustworthy, get included on quests, and sabotage without being caught
- Think carefully before acting — every vote and nomination reveals information
- It's important to communicate and discuss with other players. Make sure that you discuss all descisions fully, but don't feel like you always have to say something to every chat message. Contribute to discussions, but don't dominate.`;
}

export function describeGameState(
  state: GameState,
  availableActions: string[],
  recentMessages: ChatMessage[],
): string {
  const lines: string[] = [];
  const numPlayers = state.players.length;

  if (state.status === "finished") {
    lines.push(`## Game Over: ${state.result ?? "Unknown result"}`);
    if (state.hiddenRoles && Object.keys(state.hiddenRoles).length > 0) {
      lines.push("\nFinal role reveal:");
      for (const [player, role] of Object.entries(state.hiddenRoles)) {
        lines.push(`  ${player}: ${role}`);
      }
    }
    return lines.join("\n");
  }

  lines.push("## Game State Update");

  const questData = questInfo[numPlayers] ?? questInfo[8]!;
  let arthurianWins = 0;
  let mordreicFails = 0;

  const completedRounds = state.rounds.filter((r) => r.quest?.completed);
  if (completedRounds.length > 0) {
    lines.push("\nQuest history:");
    for (const round of completedRounds) {
      const q = round.quest!;
      const questConfig = questData[round.questNumber - 1];
      const failsRequired = questConfig?.failsRequired ?? 1;
      const failed = q.failCards >= failsRequired;
      if (failed) mordreicFails++;
      else arthurianWins++;
      lines.push(
        `  Quest ${round.questNumber}: ${failed ? "FAILED" : "SUCCEEDED"} (${q.successCards} success, ${q.failCards} fail cards)`,
      );
    }
    lines.push(
      `Score: Arthurian ${arthurianWins} - ${mordreicFails} Mordredic (first to 3 wins)`,
    );
  }

  const currentRound = state.rounds[state.rounds.length - 1];
  if (currentRound) {
    const questConfig = questData[currentRound.questNumber - 1];
    lines.push(
      `\nCurrent quest ${currentRound.questNumber} — needs ${questConfig?.players ?? "?"} players, fails with ${questConfig?.failsRequired ?? 1}+ Fail cards`,
    );
    lines.push(`Monarch (leader): ${currentRound.monarch}`);

    if (
      currentRound.nominatedPlayers &&
      currentRound.nominatedPlayers.length > 0
    ) {
      lines.push(
        `Nominated team: ${currentRound.nominatedPlayers.join(", ")}`,
      );
    } else if (availableActions.includes("nominate")) {
      lines.push(`Waiting for you to nominate a team.`);
    } else {
      lines.push(`Waiting for ${currentRound.monarch} to nominate a team.`);
    }

    const voteEntries = Object.entries(currentRound.votes);
    if (voteEntries.length > 0) {
      const approves = voteEntries.filter(([, v]) => v === "Approve").length;
      const rejects = voteEntries.filter(([, v]) => v === "Reject").length;
      const remaining = numPlayers - voteEntries.length;
      lines.push(
        `Votes cast: ${approves} Approve, ${rejects} Reject (${remaining} players yet to vote)`,
      );
      for (const [player, vote] of voteEntries) {
        lines.push(`  ${player}: ${vote}`);
      }
    }

    if (currentRound.quest && !currentRound.quest.completed) {
      lines.push(
        `Quest in progress — team: ${currentRound.quest.questedPlayers.join(", ")}`,
      );
    }

    if (currentRound.ladyUser) {
      lines.push(
        `${currentRound.ladyUser} used Lady of the Lake on ${currentRound.ladyTarget}`,
      );
    }
  }

  if (state.ladyHolder && state.ruleset.includes("Lady of the Lake")) {
    lines.push(`\n${state.ladyHolder} holds the Lady of the Lake token`);
  }

  if (state.assassinationTarget) {
    lines.push(`\nAssassination: ${state.assassinationTarget} was targeted`);
  }

  lines.push("");
  if (availableActions.length > 0) {
    lines.push(
      `Your available actions: ${availableActions.join(", ")} — use the appropriate tool now.`,
    );
  } else {
    lines.push(
      `No game actions available right now. You may send chat messages.`,
    );
  }

  if (recentMessages.length > 0) {
    lines.push("\nNew messages:");
    for (const msg of recentMessages) {
      lines.push(`  [${msg.playerName}]: ${msg.message}`);
    }
  }

  return lines.join("\n");
}
