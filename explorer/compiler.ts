import { Lexer } from "../src/lexer.ts";
import { Parser, ParserNode } from "../src/parser.ts";
import { Preprocessor } from "../src/preprocessor.ts";
import { RISCV64_Linux } from "../src/targets/RISCV64_Linux.ts";
import { BYTECODE } from "../src/targets/BYTECODE.ts";
import { Target } from "../src/targets/target.ts";
import { X86_64_Linux } from "../src/targets/X86_64_Linux.ts";

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

export function compile(code: string, ctarget: string): string {
	const preprocessor = new Preprocessor(["stdlib/", "stdlib/" + ctarget + "/"]);
	code = preprocessor.preprocess(code);
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, code, "<in>");
    const global = parser.global();
	const target = toTarget(ctarget, global);
    const generated = target.generate();
	return generated;
}