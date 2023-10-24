// import { Interpreter } from "./interpreter.ts";
import { Lexer } from "./lexer.ts";
import { Parser, ParserNode } from "./parser.ts";
import { Preprocessor } from "./preprocessor.ts";
import { BYTECODE } from "./targets/BYTECODE.ts";
import { RISCV64_Linux } from "./targets/RISCV64_Linux.ts";
import { Target } from "./targets/target.ts";
import { X86_64_Linux } from "./targets/X86_64_Linux.ts";

function toTarget(target: string, global: ParserNode): Target {
	switch (target) {
		case "riscv64-linux-gnu":
			return new RISCV64_Linux(global);
		case "x86_64-linux-nasm":
			return new X86_64_Linux(global);
		case "bytecode":
			return new BYTECODE(global);
		default:
			throw new Error(`Target ${target} not found!`);
	}
}

async function main() {
	let output = undefined;
	let input = undefined;
	const includes = ["./stdlib/", "/usr/firestorm/include/"];
	let ctarget = "x86_64-linux-nasm";

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
		} else if (Deno.args[idx] == "-t") {
			if (idx + 1 < Deno.args.length) {
				idx++;
				ctarget = Deno.args[idx];
			} else {
				throw new Error("Expected argument after -t");
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

	includes.push(`./stdlib/${ctarget}/`);
	includes.push(`/usr/firestorm/include/${ctarget}/`);

	// console.log(includes);

	if (output == undefined || input == undefined) {
		throw new Error("Please specify a output and a input");
	}

	const mode = output.split(".").reverse()[0] as string;

    let code = Deno.readTextFileSync(input);
	const preprocessor = new Preprocessor(includes);
	code = preprocessor.preprocess(code);
    // Deno.writeTextFileSync(output + ".pp", code);
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    // Deno.writeTextFileSync(output + ".tokens.json", JSON.stringify(tokens, undefined, 4));
    const parser = new Parser(tokens, code, input);
    const global = parser.global();
    // Deno.writeTextFileSync(output + ".global.json", JSON.stringify(global, undefined, 4));
    // const interpreter = new Interpreter(global);
    // interpreter.execute();

	const target = toTarget(ctarget, global);
    const generated = target.generate();


	await target.compile(mode, output, generated);

	console.log(`Successfully compiled '${input}'`);
}

await main();
