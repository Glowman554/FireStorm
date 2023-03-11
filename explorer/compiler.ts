import { Lexer } from "../src/lexer.ts";
import { Parser } from "../src/parser.ts";
import { Preprocessor } from "../src/preprocessor.ts";
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