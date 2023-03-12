import { ParserNode } from "../parser.ts";

export class If {
	true_block: ParserNode[];
	false_block: ParserNode[] | undefined;

	constructor(true_block: ParserNode[], false_block: ParserNode[] | undefined) {
		this.true_block = true_block;
		this.false_block = false_block;
	}
}