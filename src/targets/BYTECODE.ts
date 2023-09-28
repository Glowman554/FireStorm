import { Compare } from "../features/compare.ts";
import { NamedDatatype } from "../features/datatype.ts";
import { Function, FunctionCall } from "../features/function.ts";
import { If } from "../features/if.ts";
import { ParserNode, ParserNodeType } from "../parser.ts";
import { Target } from "./target.ts";

interface LinkLocation {
    name: string;
    byteIdx: number;
};

class BYTECODE_Writer {
	output: Deno.FsFile;
	constructor (file: string) {
		this.output = Deno.openSync(file, {
			create: true,
			write: true,
			truncate: true
		});
	}

	symbols: LinkLocation[] = [];
	linlocs: LinkLocation[] = [];

	write(linesStr: string) {
		const lines = linesStr.split("\n").map(l => l.trim());

		let byteIdx = 0;
		for (let i of lines) {
			if (i == "") {
				continue;
			}
			if (i.includes(";")) {
				i = i.substring(0, i.indexOf(";")).trim();
			}

			if (i.startsWith("[")) {
				// ignore
			} else if (i.endsWith(":")) {
				this.symbols.push({
					name: i.substring(0, i.length - 1),
					byteIdx: byteIdx
				});
			} else if (i.startsWith("db ")) {
				const values = i.substring(3).split(",");

				for (let val of values) {
					if (val.startsWith("\"") && val.endsWith("\"")) {
						val = val.substring(1, val.length - 1);
						for (const c of val) {
							this.output.writeSync(new Uint8Array([c.charCodeAt(0)]));
							byteIdx++;
						}
					} else {
						this.output.writeSync(new Uint8Array([parseInt(val)]));
						byteIdx++;
					}
				}
			} else if (i.startsWith("dq ")) {
				const values = i.substring(3).split(",");

				for (const val of values) {
					const parsed = parseInt(val);
					if (isNaN(parsed)) {
						this.linlocs.push({
							name: val,
							byteIdx: byteIdx
						});
						this.output.writeSync(new Uint8Array(new BigUint64Array([BigInt(0)]).buffer));
					} else {
						this.output.writeSync(new Uint8Array(new BigUint64Array([BigInt(parsed)]).buffer));
					}
					byteIdx += 8;
				}
			} else {
				throw new Error("Invalid line " + i);
			}
		}

		console.log(this.symbols);
		// console.log(this.linlocs);

		for (const loc of this.linlocs) {
			const symbol = this.symbols.find(s => s.name == loc.name);
			if (symbol) {
				this.output.seekSync(loc.byteIdx, Deno.SeekMode.Start);
				this.output.writeSync(new Uint8Array(new BigUint64Array([BigInt(symbol.byteIdx)]).buffer));
			} else {
				throw new Error("Symbol " + loc.name + " not found!");
			}
		}

		this.output.close();
	}
}

interface SectionInfo {
	name: string | undefined;
	body: string[];
	type: "function" | "global";
}

class BYTECODE_Encoder {	
	instructions = [
		"global_reserve",
	
		"assign",
		"assign_indexed",
		"load",
		"load_indexed",
	
		"number",
		"string",
	
		"goto",
		"goto_true",
		"goto_false",
		"invoke",
		"invoke_native",
		"return",
	
		"variable",
	
		"increase",
		"decrease",
		"add",
		"sub",
		"mul",
		"div",
		"mod",
	
		"less",
		"less_equals",
		"more",
		"more_equals",
		"equals",
		"not_equals",
	
		"invert",
	
		"shift_left",
		"shift_right",
		"or",
		"and",
		"xor",
		"not",
	
		"noreturn",
		"delete"
	];
	
	datatypes = [ "int", "chr", "str" ]; 
	natives = ["printc", "allocate", "deallocate", "do_exit", "file_open", "file_write", "file_read", "file_close", "file_size"];

	globals: string[] = [];



	parseCode(lines: string[]): SectionInfo[] {
		const sections: SectionInfo[] = [];
		let currentSection: SectionInfo | null = null;
	
		for (const line of lines) {
			if (line.startsWith("@")) {
				const pis = line.split(" ");
				switch (pis[0]) {
					case "@begin":
						currentSection = { name: pis[2], body: [], type: pis[1] as "function" | "global" };
						break;
					case "@end":
						sections.push(currentSection as SectionInfo);
						currentSection = null;
						break;
	
				}
			} else if (currentSection) {
				currentSection.body.push(line);
			}
		}
	
		return sections;
	}

	translateFunction(f: SectionInfo) {
		let bin = "";
		const locales: string[] = [];

		const varID = (name: string) => {
			if (locales.includes(name)) {
				return locales.indexOf(name);
			} else if (this.globals.includes(name)) {
				return this.globals.indexOf(name) + 256;
			} else {
				throw new Error(name + " not found!");
			}
		};

		for (const is of f.body) {
			if (is == "") {
				continue;
			}
			const instruction = is.split(" ");
	
			if (is.endsWith(":")) {
				bin += `_${is}\n`;
				continue;
			} 
	
			bin += `\tdb ${this.instructions.indexOf(instruction[0])} ; ${is}\n`;
	
			switch (instruction[0]) {
				case "global_reserve":
				case "variable":
					if (instruction[0] == "variable") {
						locales.push(instruction[1]);
					}
					bin += `\t\tdq ${varID(instruction[1])}\n\t\tdb ${this.datatypes.indexOf(instruction[2])}, ${instruction[3] == "true" ? 1 : 0}\n`;
					break;
	
				case "load":
				case "load_indexed":
				case "assign":
				case "assign_indexed":
				case "increase":
				case "decrease":
					bin += `\t\tdq ${varID(instruction[1])}\n`;
					break;
				
				case "number":
					bin += `\t\tdq ${instruction[1]}\n`;
					break;
	
				case "invoke":
				case "goto":
				case "goto_false":
				case "goto_true":
					bin += `\t\tdq _${instruction[1]}\n`;
					break;
	
				case "invoke_native":
					if (!this.natives.includes(instruction[1])) {
						throw new Error("Native " + instruction[1] + " not found!");
					}
					bin += `\t\tdq ${this.natives.indexOf(instruction[1])}\n`;
					break;
	
				case "string":
					{
						const s = is.substring(is.indexOf("\"") + 1, is.lastIndexOf("\""));
						bin += `\t\tdq ${s.length}\n`;
						bin += `\t\tdb "${s}", 0\n`;
					}
					break;
			
				default:
					if (!this.instructions.includes(instruction[0]) || instruction.length != 1) {
						throw new Error("Invalid instruction " + instruction[0]);
					}
			}
	
			// bin += `; ${is}\n`;
		}
		// console.log(locales);
	
		return bin;
	}

	mergeGlobals(s: SectionInfo[]) {
		const finalGlobal: SectionInfo = {
			name: "global",
			body: [],
			type: "global"
		};
		const otherSections: SectionInfo[] = [];

		for (const i of s) {
			if (i.type == "global") {
				for (const j of i.body) {
					finalGlobal.body.push(j);
				}
			} else {
				otherSections.push(i);
			}
		}

		return [finalGlobal, ...otherSections];
	}

	translateGlobal(f: SectionInfo) {
		const globalInitSection: SectionInfo = {
			name: "global",
			body: [],
			type: "function"
		};

		globalInitSection.body.push("global:");

		for (const is of f.body) {
			if (is == "") {
				continue;
			}
			const instruction = is.split(" ");
		
			switch (instruction[0]) {
				case "global":
					this.globals.push(instruction[1]);

					globalInitSection.body.push(`global_reserve ${instruction[1]} ${instruction[2]} false`);

					if (instruction[2] == "int" || instruction[2] == "chr") {
						globalInitSection.body.push(`number ${instruction[3]}`)
					} else if (instruction[2] == "str") {
						globalInitSection.body.push(`string "${is.substring(is.indexOf("\"") + 1, is.lastIndexOf("\""))}"`)
					} else {
						throw new Error("Invalid instruction!");
					}
					globalInitSection.body.push(`assign ${instruction[1]}`)
					break;
				
				case "global_reserve":
					this.globals.push(instruction[1]);
					globalInitSection.body.push(is);
					break;

				default:
					if (!this.instructions.includes(instruction[0]) || instruction.length != 1) {
						throw new Error("Invalid instruction " + instruction[0]);
					}
			}
		}

		globalInitSection.body.push("number 0");
		globalInitSection.body.push("return");

		// console.log(this.globals);
	
		return this.translateFunction(globalInitSection);
	}

	encode(code: string) {
		const codeEnc = code.split("\n").map(l => l.trim());

		let final = "[org 0]\ndq _spark\ndq _global\ndq _unreachable\n";
		const sections = this.mergeGlobals(this.parseCode(codeEnc));
		for (const s of sections) {
			if (s.type == "function") {
				final += this.translateFunction(s);
			} else {
				final += this.translateGlobal(s);
			}
		}

		return final;
	}
}

class CompiledFunction {
	code: string;
	name: string;
	used_functions: string[];
	keep: boolean;

	constructor (name: string) {
		this.code = "";
		this.name = name;
		this.used_functions = [];
		this.keep = false;
	}

	use(name: string) {
		if (!this.used_functions.includes(name)) {
			this.used_functions.push(name);
		}
	}
}

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
	generateExpression(exp: ParserNode, cf: CompiledFunction): string {
		let code = "";
		switch (exp.id) {
			case ParserNodeType.NUMBER:
				code += `\tnumber ${exp.value as number}\n`;
				break;
			case ParserNodeType.STRING:
				code += `\tstring "${exp.value as string}"\n`;
				break;
			case ParserNodeType.COMPARE:
				code += this.generateExpression(exp.a as ParserNode, cf);
				code += this.generateExpression(exp.b as ParserNode, cf);
				code += `\t${exp.value as Compare}\n`;	
				break;
			case ParserNodeType.NOT:
				code += this.generateExpression(exp.a as ParserNode, cf);
				code += `\tinvert\n`;
				break;
			case ParserNodeType.ADD:
				code += this.generateExpression(exp.a as ParserNode, cf);
				code += this.generateExpression(exp.b as ParserNode, cf);
				code += `\tadd\n`;
				break;
			case ParserNodeType.SUBSTRACT:
				code += this.generateExpression(exp.a as ParserNode, cf);
				code += this.generateExpression(exp.b as ParserNode, cf);
				code += `\tsub\n`;
				break;
			case ParserNodeType.MULTIPLY:
				code += this.generateExpression(exp.a as ParserNode, cf);
				code += this.generateExpression(exp.b as ParserNode, cf);
				code += `\tmul\n`;
				break;
			case ParserNodeType.DIVIDE:
				code += this.generateExpression(exp.a as ParserNode, cf);
				code += this.generateExpression(exp.b as ParserNode, cf);
				code += `\tdiv\n`;
				break;
			case ParserNodeType.MODULO:
				code += this.generateExpression(exp.a as ParserNode, cf);
				code += this.generateExpression(exp.b as ParserNode, cf);
				code += `\tmod\n`;
				break;
			case ParserNodeType.OR:
				code += this.generateExpression(exp.a as ParserNode, cf);
				code += this.generateExpression(exp.b as ParserNode, cf);
				code += `\tor\n`;
				break;
			case ParserNodeType.AND:
				code += this.generateExpression(exp.a as ParserNode, cf);
				code += this.generateExpression(exp.b as ParserNode, cf);
				code += `\tand\n`;
				break;
			case ParserNodeType.XOR:
				code += this.generateExpression(exp.a as ParserNode, cf);
				code += this.generateExpression(exp.b as ParserNode, cf);
				code += `\txor\n`;
				break;
			case ParserNodeType.BIT_NOT:
				code += this.generateExpression(exp.a as ParserNode, cf);
				code += `\tnot\n`;
				break;
			case ParserNodeType.SHIFT_LEFT:
				code += this.generateExpression(exp.a as ParserNode, cf);
				code += this.generateExpression(exp.b as ParserNode, cf);
				code += `\tshift_left\n`;
				break;
			case ParserNodeType.SHIFT_RIGHT:
				code += this.generateExpression(exp.a as ParserNode, cf);
				code += this.generateExpression(exp.b as ParserNode, cf);
				code += `\tshift_right\n`;
				break;
			case ParserNodeType.FUNCTION_CALL:
				{
					const fc = exp.value as FunctionCall;
					cf.use(fc.name);

					for (let i = 0; i < fc._arguments.length; i++) {
						code += this.generateExpression(fc._arguments[i], cf);
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
				code += this.generateExpression(exp.a as ParserNode, cf);
				code += `\tload_indexed ${exp.value as string}\n`;
				break;
			default:
				throw new Error("Unsupported " + exp.id);
		}
		return code;
	}

	generateCodeBlock(f: Function, block: ParserNode[], cf: CompiledFunction): string {
		let code = "";
		for (let i = 0; i < block.length; i++) {
			switch (block[i].id) {
				case ParserNodeType.VARIABLE_DECLARATION:
					{
						const d = block[i].value as NamedDatatype;
						code += `\tvariable ${d.name} ${d.datatype} ${d.array}\n`;

						if (block[i].a) {
							code += this.generateExpression(block[i].a as ParserNode, cf);
							code += `\tassign ${d.name}\n`;
						}
					}
					break;
				case ParserNodeType.VARIABLE_ASSIGN:
					if (block[i].a) {
						code += this.generateExpression(block[i].a as ParserNode, cf);
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
					code += this.generateExpression(block[i].a as ParserNode, cf);
					code += this.generateExpression(block[i].b as ParserNode, cf);
					code += `\tassign_indexed ${block[i].value as string}\n`;
					break;
				case ParserNodeType.FUNCTION_CALL:
					{
						const fc = block[i].value as FunctionCall;
						cf.use(fc.name);
						
						for (let i = 0; i < fc._arguments.length; i++) {
							code += this.generateExpression(fc._arguments[i], cf);
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
						code += this.generateExpression(block[i].a as ParserNode, cf);
					} else {
						code += "\tnumber 0\n";
					}
					code += "\treturn\n";
					break;
				case ParserNodeType.IF:
					{
						code += this.generateExpression(block[i].a as ParserNode, cf);
						const iff = block[i].value as If;
						const label = this.label();
						if (iff.false_block) {
							const label2 = this.label();
							code += `\tgoto_false ${label}\n`;
							code += this.generateCodeBlock(f, iff.true_block, cf);
							code += `\tgoto ${label2}\n`;
							code += label + ":\n";
							code += this.generateCodeBlock(f, iff.false_block, cf);
							code += label2 + ":\n";
						} else {
							code += `\tgoto_false ${label}\n`;
							code += this.generateCodeBlock(f, iff.true_block, cf);
							code += label + ":\n";
						}
					}
					break;
				case ParserNodeType.CONDITIONAL_LOOP:
					{
						const loop_back_label = this.label();
						code += loop_back_label + ":\n";
						code += this.generateExpression(block[i].a as ParserNode, cf);
						const loop_exit_label = this.label();
						code += `\tgoto_false ${loop_exit_label}\n`;
						code += this.generateCodeBlock(f, block[i].value as ParserNode[], cf);
						code += `\tgoto ${loop_back_label}\n`;
						code += loop_exit_label + ":\n";
					}
					break;
				case ParserNodeType.POST_CONDITIONAL_LOOP:
					{
						const loop_back_label = this.label();
						code += loop_back_label + ":\n";
						code += this.generateCodeBlock(f, block[i].value as ParserNode[], cf);
						code += this.generateExpression(block[i].a as ParserNode, cf);
						code += `\tgoto_true ${loop_back_label}\n`;
					}
					break;
				case ParserNodeType.LOOP:
					{
						const label = this.label();
						code += label + ":\n";
						code += this.generateCodeBlock(f, block[i].value as ParserNode[], cf);
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
		const cf = new CompiledFunction(f.name);

		let code = "";
		let aftercode = "";
		let precode = "";

		if (f.attributes.includes("assembly")) {
			return undefined;
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

			code += this.generateCodeBlock(f, f.body, cf);
		}

		cf.code = `@begin function ${f.name}\n` + f.name + ":\n" + precode + code + aftercode + "@end function\n";

		return cf;
	}

	compiledFunctions: CompiledFunction[] = [];

	keepFunction(name: string) {
		const f = this.compiledFunctions.find(v => v.name == name) as CompiledFunction;
		
		if (f == undefined || f.keep) {
			return; // do not cause loops
		}

		f.keep = true;
		for (let i = 0; i < f.used_functions.length; i++) {
			this.keepFunction(f.used_functions[i]);
		}
	}

	generate(): string {
		const tmp = this.global.value as ParserNode[];

		let code = "";

		code += "@begin global\n";
		for (let i = 0; i < tmp.length; i++) {
			switch (tmp[i].id) {
				case ParserNodeType.FUNCTION:
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
		code += "@end global\n";		
		
		for (let i = 0; i < tmp.length; i++) {
			switch (tmp[i].id) {
				case ParserNodeType.FUNCTION:
					{
						const f = this.generateFunction(tmp[i].value as Function);
						if (f) {
							this.compiledFunctions.push(f);
						}
					}
					break;
				case ParserNodeType.VARIABLE_DECLARATION:
					break;
				default:
					throw new Error("Unsupported " + tmp[i].id);
			}
		}

		for (let i = 0; i < tmp.length; i++) {
			switch (tmp[i].id) {
				case ParserNodeType.FUNCTION:
					{
						if ((tmp[i].value as Function).attributes.includes("keep")) {
							this.keepFunction((tmp[i].value as Function).name);
						}
					}
					break;
			}
		}

		if (this.compiledFunctions.find(v => v.name == "spark")) {
			this.keepFunction("spark");
		}

		for (let i = 0; i < this.compiledFunctions.length; i++) {
			if (this.compiledFunctions[i].keep) {
				code += this.compiledFunctions[i].code;
			} else {
				console.log("Removing unused function " + this.compiledFunctions[i].name);
			}
		}

		return code;
	}

	async compile(mode: string, output: string, generated: string): Promise<void> {	
		switch (mode) {
			case "flb":
				Deno.writeTextFileSync(output, generated);
				break;
			case "flenc":
				Deno.writeTextFileSync(output, new BYTECODE_Encoder().encode(generated));
				break;
			case "flbb":
				new BYTECODE_Writer(output).write(new BYTECODE_Encoder().encode(generated));
				break;
			default:
				throw new Error("Mode " + mode + " not found!");
		}
	}
}