// import { Interpreter } from "./interpreter.ts";
import { Lexer } from "./lexer.ts";
import { Parser } from "./parser.ts";
import { Preprocessor } from "./preprocessor.ts";
import { X86_64_Linux } from "./targets/X86_64_Linux.ts";

async function runCommand(command: string) {
	console.log("cmd: " + command);
	const proc = Deno.run({
		cmd: command.split(" "),
		stderr: "inherit",
		stdout: "inherit"
	});

	const status = await proc.status();
	if (!status.success) {
		throw new Error("Could not execute: " + command);
	}
}

async function main() {
	let output = undefined;
	let input = undefined;
	const includes = ["./stdlib/"];

	let idx = 0;
	while (idx < Deno.args.length) {
		if (Deno.args[idx] == "-o") {
			if (idx + 1 < Deno.args.length) {
				idx++;
				output = Deno.args[idx];
			} else {
				throw new Error("Expected argument after -o");
			}
		} else if (Deno.args[idx] == "-i") {
			if (idx + 1 < Deno.args.length) {
				idx++;
				includes.push(Deno.args[idx]);
			} else {
				throw new Error("Expected argument after -i");
			}
		} else {
			if (input == undefined) {
				input = Deno.args[idx];
			} else {
				throw new Error("Too many arguments!");
			}
		}
		idx++;
	}

	if (output == undefined || input == undefined) {
		throw new Error("Please specify a output and a input");
	}

	const mode = output.split(".").reverse()[0] as string;

    let code = Deno.readTextFileSync(input);
	const preprocessor = new Preprocessor(includes);
	code = preprocessor.preprocess(code);
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    Deno.writeTextFileSync(output + ".tokens.json", JSON.stringify(tokens, undefined, 4));
    const parser = new Parser(tokens);
    const global = parser.global();
    Deno.writeTextFileSync(output + ".global.json", JSON.stringify(global, undefined, 4));
    // const interpreter = new Interpreter(global);
    // interpreter.execute();

	const target = new X86_64_Linux(global);
    const generated = target.generate();

	switch (mode) {
		case "asm":
			Deno.writeTextFileSync(output, generated);
			break;
		case "o":
			Deno.writeTextFileSync(output + ".asm", generated);
			await runCommand(`nasm ${output + ".asm"} -felf64 -o ${output} -g`);
			break;
		case "elf":
			Deno.writeTextFileSync(output + ".asm", generated);
			await runCommand(`nasm ${output + ".asm"} -felf64 -o ${output + ".o"} -g`);
			await runCommand(`gcc ${output + ".o"} -o ${output} --static -fno-pie -g`);
			break;
		default:
			throw new Error("Mode " + mode + " not found!");
	}

}

await main();