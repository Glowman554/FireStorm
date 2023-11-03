import { BaseCommand } from "./command.ts";

import { CreateCommand } from "./commands/create.ts";
import { LoginCommand } from "./commands/login.ts";
import { LogoutCommand } from "./commands/logout.ts";
import { BuildCommand } from "./commands/build.ts";
import { DeployCommand } from "./commands/deploy.ts";
import { DeleteCommand } from "./commands/delete.ts";
import { GetCommand } from "./commands/get.ts";

const commands: { [key: string]: {new(args: string[]): BaseCommand} } = {
    "create": CreateCommand,
    "login": LoginCommand,
    "logout": LogoutCommand,
	"delete": DeleteCommand,
	"build": BuildCommand,
	"deploy": DeployCommand,
	"get": GetCommand
};

async function main() {
	const argsCopy = Object.assign([], Deno.args);
	const subCommand = argsCopy.shift();

	if (subCommand == undefined) {
		throw new Error("No sub command specified");
	}

	const command = commands[subCommand];

	if (!command) {
		throw new Error(`Command ${subCommand} not found`);
	} else {
		await new command(argsCopy).execute();
	}
}

await main();