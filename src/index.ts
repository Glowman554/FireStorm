import { Interpreter } from "./interpreter.ts";
import { Lexer } from "./lexer.ts";
import { Parser } from "./parser.ts";
import { X86_64_Linux } from "./targets/X86_64_Linux.ts";

function main() {
    const code = Deno.readTextFileSync("test.fl");
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    Deno.writeTextFileSync("test.tokens.json", JSON.stringify(tokens, undefined, 4));
    const parser = new Parser(tokens);
    const global = parser.global();
    Deno.writeTextFileSync("test.global.json", JSON.stringify(global, undefined, 4));
    // const interpreter = new Interpreter(global);
    // interpreter.execute();

	const target = new X86_64_Linux(global);
    const generated = target.generate();
	Deno.writeTextFileSync("test.asm", generated);
}

main();