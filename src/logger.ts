import chalk from "chalk";

const DIVIDER = chalk.gray("─".repeat(60));

function timestamp(): string {
  return chalk.gray(new Date().toLocaleTimeString("en-US", { hour12: false }));
}

function playerTag(name: string): string {
  return chalk.bold.cyan(`[${name}]`);
}

export const logger = {
  gameStart(playerCount: number): void {
    console.log("\n" + chalk.bold.yellow("═".repeat(60)));
    console.log(
      chalk.bold.yellow(`  AVALON SIMULATION — ${playerCount} players`),
    );
    console.log(chalk.bold.yellow("═".repeat(60)) + "\n");
  },

  gameComplete(): void {
    console.log("\n" + chalk.bold.yellow("═".repeat(60)));
    console.log(chalk.bold.yellow("  SIMULATION COMPLETE"));
    console.log(chalk.bold.yellow("═".repeat(60)) + "\n");
  },

  roleReveal(name: string, role: string): void {
    const isEvil = [
      "Assassin",
      "Mordred",
      "Morgana",
      "Oberon",
      "Mordredic Servant",
    ].includes(role);
    const roleStr = isEvil ? chalk.red(role) : chalk.green(role);
    console.log(`  ${chalk.bold(name.padEnd(12))} ${roleStr}`);
  },

  gameOver(result: string): void {
    const isGood = result === "Arthurian Victory";
    const color = isGood ? chalk.bold.green : chalk.bold.red;
    console.log("\n" + DIVIDER);
    console.log(color(`  RESULT: ${result}`));
    console.log(DIVIDER + "\n");
  },

  gameState(
    status: string,
    score: { passes: number; fails: number },
    questNumber?: number,
    monarch?: string,
    nominated?: string[],
    votes?: { count: number; total: number },
    result?: string,
  ): void {
    const scoreStr =
      chalk.green(`Arthurian ${score.passes}`) +
      chalk.gray(" — ") +
      chalk.red(`Mordredic ${score.fails}`);

    const parts = [chalk.bold.magenta("▶ GAME"), scoreStr];
    if (questNumber !== undefined)
      parts.push(chalk.white(`Quest ${questNumber}`));
    if (monarch) parts.push(`Monarch: ${chalk.bold(monarch)}`);
    if (nominated)
      parts.push(`Team: ${chalk.bold(nominated.join(", "))}`);
    if (votes)
      parts.push(
        chalk.gray(`Votes: ${votes.count}/${votes.total}`),
      );
    if (result) parts.push(chalk.bold(result));

    console.log(parts.join(chalk.gray("  |  ")));
  },

  chat(playerName: string, message: string): void {
    console.log(
      `${timestamp()} ${playerTag(playerName)}  ${message}`,
    );
  },

  thinking(playerName: string, text: string): void {
    const truncated = text.length > 200 ? text.slice(0, 200) + "…" : text;
    console.log(
      chalk.dim(
        `           ${chalk.italic(`(${playerName})`)}: ${truncated}`,
      ),
    );
  },

  nominate(playerName: string, playerIds: string[]): void {
    console.log(
      `${timestamp()} ${playerTag(playerName)} ${chalk.blue("nominates")} ${chalk.bold(playerIds.join(", "))}`,
    );
  },

  vote(playerName: string, vote: string): void {
    const voteStr =
      vote === "Approve"
        ? chalk.bold.green("✓ Approve")
        : chalk.bold.red("✗ Reject");
    console.log(`${timestamp()} ${playerTag(playerName)} ${voteStr}`);
  },

  questCard(playerName: string, action: string): void {
    const actionStr =
      action === "Succeed"
        ? chalk.bold.green("★ Succeed")
        : chalk.bold.red("✗ Fail");
    console.log(`${timestamp()} ${playerTag(playerName)} played ${actionStr}`);
  },

  ladyOfLake(playerName: string, targetId: string): void {
    console.log(
      `${timestamp()} ${playerTag(playerName)} ${chalk.cyan("uses Lady of the Lake")} on ${chalk.bold(targetId)}`,
    );
  },

  assassinate(playerName: string, targetId: string): void {
    console.log(
      `${timestamp()} ${playerTag(playerName)} ${chalk.bold.red("☠ ASSASSINATES")} ${chalk.bold(targetId)}`,
    );
  },

  error(playerName: string, err: unknown): void {
    console.error(
      chalk.red(`[ERROR] ${playerName}: ${err instanceof Error ? err.message : err}`),
    );
  },
};
