import { Command } from "commander";
import { simulateAvalonGame } from "./simulation";

const program = new Command();

program
  .name("avalon")
  .description("LLM-powered Avalon simulation")
  .version("0.1.0");

program
  .command("simulate")
  .description("Run a full Avalon game simulation with LLM agents")
  .action(async () => {
    await simulateAvalonGame();
  });

program.parse();
