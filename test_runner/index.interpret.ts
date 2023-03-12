interface Expected {
	arguments: string[],
	output: string[],
	should_fail: boolean
}

async function runCommand(command: string) {
	// console.log("cmd: " + command);
	const proc = Deno.run({
		cmd: command.split(" ").filter(v => v != ""),
		stderr: "null",
		stdout: "piped"
	});

	const status = await proc.status();
	const stdout = new TextDecoder().decode(await proc.output());
	proc.close();
	if (!status.success) {
		throw new Error("Could not execute: " + command);
	}

	return stdout;
}

const COLOR_RESET = "\u001B[0m";
const RED = "\u001B[31m";
const GREEN = "\u001B[32m";

async function runTest(file: string) {
	try {
		const expected = JSON.parse(Deno.readTextFileSync(file + ".expect")) as Expected;

		// console.log("RUN: " + file + ".elf");
		let output = undefined;
		try {
			output = await runCommand(`deno run -A src/index.interpret.ts ${file} ${expected.arguments.map(v => "-a " + v).join(" ")}`);
		} catch (_e) {/**/}

		let passed = true;

		if (output == undefined) {
			if (!expected.should_fail) {
				passed = false;
			}
		} else {
			if (expected.should_fail) {
				passed = false;
			}
			const output_split = output.split("\n");
			for (let i = 0; i < expected.output.length; i++) {
				if (expected.output[i] != "*") {
					if (expected.output[i] != output_split[i]) {
						passed = false;
					}
				}
			}
		}

		let summary = "";

		summary += "=== PROGRAM OUTPUT ===\n";
		summary += output || "DID NOT RUN\n";
		summary += "=== EXPECTED OUTPUT ===\n";
		summary += expected.output.join("\n") + "\n";

		if (passed) {
			summary += "=== TEST PASSED ===";
			console.log(`${GREEN}TEST PASSED:${COLOR_RESET} ${file}`);
		} else {
			summary += "=== TEST NOT PASSED ===";
			console.log(`${RED}TEST NOT PASSED:${COLOR_RESET} ${file}`);
		}


		Deno.writeTextFileSync(file + ".interpret.summary", summary);
	} catch (e) {
		console.log(RED + "RUN FAILED FOR: " + file + ". Reason: " + e + COLOR_RESET);
	}
}
async function main() {
	const promises: Promise<void>[] = [];
	for await (const dirEntry of Deno.readDir('tests')) {
		if (dirEntry.name.endsWith(".fl")) {
			promises.push(runTest("tests/" + dirEntry.name));
		}
	}

	await Promise.all(promises);
	console.log("Test runner done.");
}

await main();