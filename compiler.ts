import { Lexer } from "../src/lexer.ts";
import { Parser } from "../src/parser.ts";
import { Preprocessor } from "../src/preprocessor.ts";
import { Interpreter } from "../src/targets/interpreter.ts";
import { X86_64_Linux } from "../src/targets/X86_64_Linux.ts";

export function compile(code: string): string {
	const preprocessor = new Preprocessor(["stdlib/"]);
	code = preprocessor.preprocess(code);
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const global = parser.global();
	const target = new X86_64_Linux(global);
    const generated = target.generate();
	return generated;
}


export function execute(code: string, args: string[]) {
	const preprocessor = new Preprocessor(["stdlib/"]);
	code = preprocessor.preprocess(code);
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const global = parser.global();
	const interpreter = new Interpreter(global, args);
    interpreter.execute();
	console.log(interpreter.memory);
	console.log("=== DETECTED LEAKS ===");
	for (let i = 0; i < interpreter.memory.allocations.length; i++) {
		if (!interpreter.memory.strings.find(v => v.ptr ==  interpreter.memory.allocations[i].ptr)) {
			console.log("Leak at: " + interpreter.memory.allocations[i].ptr + " with size " + interpreter.memory.allocations[i].size);
		}
	} 
}