import { Interpreter } from "./targets/interpreter.ts";
import { Lexer } from "./lexer.ts";
import { Parser } from "./parser.ts";
import { Preprocessor } from "./preprocessor.ts";

async function main() {
	let input = undefined;
	const includes = ["./stdlib/", "/usr/firestorm/include/"];
	let args: string[] = [];

	let idx = 0;
	while (idx < Deno.args.length) {
		if (Deno.args[idx] == "-i") {
			if (idx + 1 < Deno.args.length) {
				idx++;
				includes.push(Deno.args[idx]);
			} else {
				throw new Error("Expected argument after -i");
			}
		} else if (Deno.args[idx] == "-a") {
			if (idx + 1 < Deno.args.length) {
				idx++;
				args.push(Deno.args[idx]);
			} else {
				throw new Error("Expected argument after -a");
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

	if (input == undefined) {
		throw new Error("Please specify a input file");
	}

	args = [input, ...args];
	// console.log(args);

    let code = Deno.readTextFileSync(input);
	const preprocessor = new Preprocessor(includes);
	code = preprocessor.preprocess(code);
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const global = parser.global();
	const interpreter = new Interpreter(global, args);
    interpreter.execute();
}

await main();
