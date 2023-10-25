
export async function runCommand(command: string) {
	console.log("cmd: " + command);
	const proc = Deno.run({
		cmd: command.split(" "),
		stderr: "inherit",
		stdout: "inherit"
	});

	const status = await proc.status();
	proc.close();
	if (!status.success) {
		throw new Error("Could not execute: " + command);
	}
}