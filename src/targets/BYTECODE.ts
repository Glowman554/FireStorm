import { Compare } from "../features/compare.ts";
import { NamedDatatype } from "../features/datatype.ts";
import { Function, FunctionCall } from "../features/function.ts";
import { If } from "../features/if.ts";
import { ParserNode, ParserNodeType } from "../parser.ts";
import { Target } from "./target.ts";

export class BYTECODE implements Target {
    global: ParserNode;

    constructor (global: ParserNode) {
        this.global = global;
	}

	resolveFunction(name: string): ParserNode | undefined {
        for (const i of this.global.value as ParserNode[]) {
            if ((i.value as Function).name == name) {
                return i;
            }
        }
    }

	clabel = 0;

	label(): string {
		return String(this.clabel++);
	}

	// generate expression and store result in target
	generateExpression(exp: ParserNode): string {
		let code = "";
		switch (exp.id) {
			case ParserNodeType.NUMBER:
				code += `\tnumber ${exp.value as number}\n`;
				break;
			case ParserNodeType.STRING:
				code += `\tstring "${exp.value as string}"\n`;
				break;
			case ParserNodeType.COMPARE:
				code += this.generateExpression(exp.a as ParserNode);
				code += this.generateExpression(exp.b as ParserNode);
				code += `\t${exp.value as Compare}\n`;	
				break;
			case ParserNodeType.NOT:
				code += this.generateExpression(exp.a as ParserNode);
				code += `\tinvert\n`;
				break;
			case ParserNodeType.ADD:
				code += this.generateExpression(exp.a as ParserNode);
				code += this.generateExpression(exp.b as ParserNode);
				code += `\tadd\n`;
				break;
			case ParserNodeType.SUBSTRACT:
				code += this.generateExpression(exp.a as ParserNode);
				code += this.generateExpression(exp.b as ParserNode);
				code += `\tsub\n`;
				break;
			case ParserNodeType.MULTIPLY:
				code += this.generateExpression(exp.a as ParserNode);
				code += this.generateExpression(exp.b as ParserNode);
				code += `\tmul\n`;
				break;
			case ParserNodeType.DIVIDE:
				code += this.generateExpression(exp.a as ParserNode);
				code += this.generateExpression(exp.b as ParserNode);
				code += `\tdiv\n`;
				break;
			case ParserNodeType.MODULO:
				code += this.generateExpression(exp.a as ParserNode);
				code += this.generateExpression(exp.b as ParserNode);
				code += `\tmod\n`;
				break;
			case ParserNodeType.OR:
				code += this.generateExpression(exp.a as ParserNode);
				code += this.generateExpression(exp.b as ParserNode);
				code += `\tor\n`;
				break;
			case ParserNodeType.AND:
				code += this.generateExpression(exp.a as ParserNode);
				code += this.generateExpression(exp.b as ParserNode);
				code += `\tand\n`;
				break;
			case ParserNodeType.XOR:
				code += this.generateExpression(exp.a as ParserNode);
				code += this.generateExpression(exp.b as ParserNode);
				code += `\txor\n`;
				break;
			case ParserNodeType.BIT_NOT:
				code += this.generateExpression(exp.a as ParserNode);
				code += `\tnot\n`;
				break;
			case ParserNodeType.SHIFT_LEFT:
				code += this.generateExpression(exp.a as ParserNode);
				code += this.generateExpression(exp.b as ParserNode);
				code += `\tshift_left\n`;
				break;
			case ParserNodeType.SHIFT_RIGHT:
				code += this.generateExpression(exp.a as ParserNode);
				code += this.generateExpression(exp.b as ParserNode);
				code += `\tshift_right\n`;
				break;
			case ParserNodeType.FUNCTION_CALL:
				{
					const fc = exp.value as FunctionCall;
					

					for (let i = 0; i < fc._arguments.length; i++) {
						code += this.generateExpression(fc._arguments[i]);
					}

					const f = this.resolveFunction(fc.name)?.value as Function | undefined;
					if (f) {
						if (f._arguments.length != fc._arguments.length) {
							throw new Error("To manny or not enough arguments!");
						}
					} else {
						throw new Error("Function " + fc.name + " not found!");
					}
					if (f.attributes.includes("assembly")) {
						code += `\tinvoke_native ${fc.name}\n`;
					} else {
						code += `\tinvoke ${fc.name}\n`;
					}
				}
				break;
			case ParserNodeType.VARIABLE_LOOKUP:
				code += `\tload ${exp.value as string}\n`;
				break;
			case ParserNodeType.VARIABLE_LOOKUP_ARRAY:
				code += this.generateExpression(exp.a as ParserNode);
				code += `\tload_indexed ${exp.value as string}\n`;
				break;
			default:
				throw new Error("Unsupported " + exp.id);
		}
		return code;
	}

	generateCodeBlock(f: Function, block: ParserNode[]): string {
		let code = "";
		for (let i = 0; i < block.length; i++) {
			switch (block[i].id) {
				case ParserNodeType.VARIABLE_DECLARATION:
					{
						const d = block[i].value as NamedDatatype;
						code += `\tvariable ${d.name} ${d.datatype} ${d.array}\n`;

						if (block[i].a) {
							code += this.generateExpression(block[i].a as ParserNode);
							code += `\tassign ${d.name}\n`;
						}
					}
					break;
				case ParserNodeType.VARIABLE_ASSIGN:
					if (block[i].a) {
						code += this.generateExpression(block[i].a as ParserNode);
						code += `\tassign ${block[i].value as string}\n`;
					}
					break;
				case ParserNodeType.VARIABLE_INCREASE:
					code += `\tincrease ${block[i].value as string}\n`;
					break;
				case ParserNodeType.VARIABLE_DECREASE:
					code += `\tdecrease ${block[i].value as string}\n`;
					break;
				case ParserNodeType.VARIABLE_ASSIGN_ARRAY:
					code += this.generateExpression(block[i].a as ParserNode);
					code += this.generateExpression(block[i].b as ParserNode);
					code += `\tassign_indexed ${block[i].value as string}\n`;
					break;
				case ParserNodeType.FUNCTION_CALL:
					{
						const fc = block[i].value as FunctionCall;
						
						for (let i = 0; i < fc._arguments.length; i++) {
							code += this.generateExpression(fc._arguments[i]);
						}

						const f = this.resolveFunction(fc.name)?.value as Function | undefined;
						if (f) {
							if (f._arguments.length != fc._arguments.length) {
								throw new Error("To manny or not enough arguments!");
							}
						} else {
							throw new Error("Function " + fc.name + " not found!");
						}
		
						if (f.attributes.includes("assembly")) {
							code += `\tinvoke_native ${fc.name}\n`;
						} else {
							code += `\tinvoke ${fc.name}\n`;
						}
						code += "\tdelete\n";
					}
					break;
				case ParserNodeType.RETURN:
					if (block[i].a) {
						code += this.generateExpression(block[i].a as ParserNode);
					} else {
						code += "\tnumber 0\n";
					}
					code += "\treturn\n";
					break;
				case ParserNodeType.IF:
					{
						code += this.generateExpression(block[i].a as ParserNode);
						const iff = block[i].value as If;
						const label = this.label();
						if (iff.false_block) {
							const label2 = this.label();
							code += `\tgoto_false ${label}\n`;
							code += this.generateCodeBlock(f, iff.true_block);
							code += `\tgoto ${label2}\n`;
							code += label + ":\n";
							code += this.generateCodeBlock(f, iff.false_block);
							code += label2 + ":\n";
						} else {
							code += `\tgoto_false ${label}\n`;
							code += this.generateCodeBlock(f, iff.true_block);
							code += label + ":\n";
						}
					}
					break;
				case ParserNodeType.CONDITIONAL_LOOP:
					{
						const loop_back_label = this.label();
						code += loop_back_label + ":\n";
						code += this.generateExpression(block[i].a as ParserNode);
						const loop_exit_label = this.label();
						code += `\tgoto_false ${loop_exit_label}\n`;
						code += this.generateCodeBlock(f, block[i].value as ParserNode[]);
						code += `\tgoto ${loop_back_label}\n`;
						code += loop_exit_label + ":\n";
					}
					break;
				case ParserNodeType.POST_CONDITIONAL_LOOP:
					{
						const loop_back_label = this.label();
						code += loop_back_label + ":\n";
						code += this.generateCodeBlock(f, block[i].value as ParserNode[]);
						code += this.generateExpression(block[i].a as ParserNode);
						code += `\tgoto_true ${loop_back_label}\n`;
					}
					break;
				case ParserNodeType.LOOP:
					{
						const label = this.label();
						code += label + ":\n";
						code += this.generateCodeBlock(f, block[i].value as ParserNode[]);
						code += `\tgoto ${label}\n`;
					}
					break;
				default:
					throw new Error("Unsupported " + block[i].id);
			}
		}

		return code;
	}

	generateFunction(f: Function) {
		let code = "";
		let aftercode = "";
		let precode = "";

		if (f.attributes.includes("assembly")) {
			return "";
		} else {
			for (let i = f._arguments.length - 1; i >= 0; i--) {
				const a = f._arguments[i];
				code += `\tvariable ${a.name} ${a.datatype} ${a.array}\n`;
				code += `\tassign ${a.name}\n`;
			}
			if (f.attributes.includes("noreturn")) {
				precode += "\tnoreturn\n";
			}

			aftercode += "\tnumber 0\n";
			aftercode += "\treturn\n";

			code += this.generateCodeBlock(f, f.body);
		}

		return `@begin function ${f.name}\n` + f.name + ":\n" + precode + code + aftercode + "@end function\n";
	}

	generate(): string {
		const tmp = this.global.value as ParserNode[];

		let code = "";
		
		for (let i = 0; i < tmp.length; i++) {
			switch (tmp[i].id) {
				case ParserNodeType.FUNCTION:
					code += this.generateFunction(tmp[i].value as Function);
					break;
				case ParserNodeType.VARIABLE_DECLARATION:
					if (tmp[i].a) {
						if ((tmp[i].value as NamedDatatype).array) {
							throw new Error("Global array inizializers not supported!");
						}

						if (tmp[i].a?.id == ParserNodeType.STRING || tmp[i].a?.id == ParserNodeType.NUMBER) {
							// gc.namedLabel(tmp[i].a?.value, tmp[i].value as NamedDatatype);
							const dt = tmp[i].value as NamedDatatype;
							switch (dt.datatype) {
								case "str":
									code += `global ${dt.name} ${dt.datatype} "${tmp[i].a?.value}"\n`;
									break;
								case "int":
									code += `global ${dt.name} ${dt.datatype} ${tmp[i].a?.value}\n`;
									break;
							}
						} else {
							throw new Error("Only string and number are supported for globals!");
						}
					} else {
						const dt = tmp[i].value as NamedDatatype;
						code += `global_reserve ${dt.name} ${dt.datatype} ${dt.array}\n`;
					}
					break;
				default:
					throw new Error("Unsupported " + tmp[i].id);
			}
		}

		return code;
	}

	async compile(mode: string, output: string, generated: string): Promise<void> {	
		switch (mode) {
			case "flb":
				Deno.writeTextFileSync(output, generated);
				break;
			default:
				throw new Error("Mode " + mode + " not found!");
		}
	}
}