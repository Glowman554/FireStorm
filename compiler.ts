import { Lexer } from "../src/lexer.ts";
import { Parser, ParserNode } from "../src/parser.ts";
import { Preprocessor } from "../src/preprocessor.ts";
import { Interpreter } from "../src/targets/interpreter.ts";
import { RISCV64_Linux } from "../src/targets/RISCV64_Linux.ts";
import { Target } from "../src/targets/target.ts";
import { X86_64_Linux } from "../src/targets/X86_64_Linux.ts";

function toTarget(target: string, global: ParserNode): Target {
	switch (target) {
		case "riscv64-linux-gnu":
			return new RISCV64_Linux(global);
		case "x86_64-linux-nasm":
			return new X86_64_Linux(global);
		default:
			throw new Error(`Target ${target} not found!`);
	}
}

export function compile(code: string, ctarget: string): string {
	const preprocessor = new Preprocessor(["stdlib/", "stdlib/" + ctarget + "/"]);
	code = preprocessor.preprocess(code);
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const global = parser.global();
	const target = toTarget(ctarget, global);
    const generated = target.generate();
	return generated;
}


export function execute(code: string, args: string[]) {
	const preprocessor = new Preprocessor(["stdlib/", "stdlib/x86_64-linux-nasm/"]);
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