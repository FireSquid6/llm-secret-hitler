import type{ GameState } from ".";

export function viewStateAs(givenState: GameState, playerId: string): GameState {
  const state = structuredClone(givenState);


  // only need to hide stuff for in progress games
  if (state.status === "finished" || state.status === "waiting") {
    return state;
  }

  if (state.rounds.length !== 0) {
    // if voting isn't complete, don't show votes
    const round = state.rounds[state.rounds.length - 1]!;

    if (Object.keys(round.votes).length !== state.players.length) {
      const newVotes: Record<string, "Approve" | "Reject"> = {}
      if (round.votes[playerId]) {
        newVotes[playerId] = round.votes[playerId];
      }
      round.votes = newVotes;
    }
    
    // only show quest result if it is done
    if (round.quest && !round.quest.completed) {
      round.quest.questedPlayers = round.quest.questedPlayers.filter((p) => p === playerId);
      round.quest.failCards = 0;
      round.quest.successCards = 0;
    }
  }

  // hide the roles
  state.hiddenRoles = {};

  return state;
}
