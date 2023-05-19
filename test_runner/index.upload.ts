interface Expected {
	arguments: string[],
	output: string[],
	should_fail: boolean
}

async function runCommand(command: string) {
	// console.log("cmd: " + command);
	const proc = Deno.run({
		cmd: command.split(" ").filter(v => v != ""),
		stderr: "inherit",
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

let upload = "";

async function runTest(file: string) {
	try {
		// console.log("COMPILE: " + file);
		const compile_output = await runCommand(`deno run -A src/index.ts ${file} -o ${file}.elf -t riscv64-linux-gnu`);

		let summary = "";

		summary += "=== COMPILE OUTPUT ===\n";
		summary += compile_output;

		summary += "=== TEST PASSED ===";
		console.log(`${GREEN}TEST PASSED:${COLOR_RESET} ${file}`);


		Deno.writeTextFileSync(file + ".summary", summary);

		upload += "put " + file + ".elf\n";
		upload += "put " + file + ".expect\n";
		upload += "put " + file + "\n";
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

	Deno.writeTextFileSync("upload.sh", "sftp ubuntu@192.168.178.142:/home/ubuntu/ft <<EOF\n" + upload + "put test_runner/index.run.js\nbye\nEOF");
}

await main();