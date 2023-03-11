import { Compare } from "../features/compare.ts";
import { Datatype, NamedDatatype } from "../features/datatype.ts";
import { Function, FunctionCall } from "../features/function.ts";
import { LexerTokenType } from "../lexer.ts";
import { Parser, ParserNode, ParserNodeType } from "../parser.ts";

class NamedVariable {
    datatype: NamedDatatype;

    constructor (datatype: NamedDatatype) {
        this.datatype = datatype;
    }

	size(): number {
		switch (this.datatype.datatype) {
			case "int":
				return 8;
			case "str":
				return 8; // 8 byte pointer
			case "chr":
				return 1;
			default:
				throw new Error("Could not get size for " + this.datatype.datatype);
		}
	}
}

class NamedVariablePtr extends NamedVariable {
	ptr: number;
    constructor (datatype: NamedDatatype, ptr: number) {
		super(datatype);
		this.ptr = ptr;
	}
}

export class StackContext {
	variables: NamedVariablePtr[];
	local_labels: string[];
	ptr: number;

	constructor() {
		this.variables = [];
		this.local_labels = [];
		this.ptr = 8; // allocate 8 bytes for rbp
	}

	register(v: NamedVariable) {
		if (this.variables.find((vr) => vr.datatype.name == v.datatype.name)) {
			throw new Error("Already exists");
		}

		this.variables.push(new NamedVariablePtr(v.datatype, this.ptr));
		this.ptr += v.size();
	}

	label(): string {
		const label = `._${this.local_labels.length}`;
		this.local_labels.push(label);
		return label;
	}

	getPtr(name: string): number | undefined {
		return this.variables.find((vr) => vr.datatype.name == name)?.ptr;
	}

	getDatatype(name: string): Datatype | undefined {
		return this.variables.find((vr) => vr.datatype.name == name)?.datatype.datatype;
	} 

	get(name: string): NamedVariable | undefined {
		return this.variables.find((vr) => vr.datatype.name == name);
	} 

	align() {
		if (this.ptr % 16 != 0) { // we need to have the stack alined. ALWAYS
			this.ptr += 1;
			this.align();
		}
	}

	generateBegin(): string {
		this.align();
		// console.log(this.ptr);
		return "\tpush rbp\n\tmov rbp, rsp\n\tsub rsp, " + this.ptr + "\n";
	}

	generateEnd(): string {
		return "\tadd rsp, " + this.ptr + "\n\tpop rbp\n";
	}
}

export class GlobalContext {
	global_labels: { val: any, name: NamedDatatype }[];

	constructor() {
		this.global_labels = [];
	}

	label(val: any, datatype: Datatype): string {
		const label = `global_${this.global_labels.length}`;
		this.global_labels.push({
			val: val,
			name: new NamedDatatype(label, datatype, false)
		});
		return label;
	}

	namedLabel(val: any, datatype: NamedDatatype) {
		if (this.global_labels.find((v) => v.name.name == datatype.name)) {
			throw new Error("Already exsists!");
		}
		this.global_labels.push({
			val: val,
			name: datatype
		});
	}


	getPtr(name: string): string | undefined {
		return this.global_labels.find((vr) => vr.name.name == name)?.name.name;
	}

	getDatatype(name: string): Datatype | undefined {
		return this.global_labels.find((vr) => vr.name.name == name)?.name.datatype;
	} 

	get(name: string): NamedVariable {
		return new NamedVariable(this.global_labels.find((vr) => vr.name.name == name)?.name as NamedDatatype);
	} 


	generate(): string {
		let code = "[section .data]\n";
		for (let i = 0; i < this.global_labels.length; i++) {
			switch (this.global_labels[i].name.datatype) {
				case "str":
					code += `${this.global_labels[i].name.name}: db "${this.global_labels[i].val || 0}", 0\n`;
					break;
				case "int":
					code += `${this.global_labels[i].name.name}: dq ${this.global_labels[i].val || 0}\n`;
					break;
				default:
					throw new Error("Unsupported");
			}
		}
		return code;
	}
}

export class X86_64_Linux {
    global: ParserNode;

    constructor (global: ParserNode) {
        this.global = global;
	}

	registers = [ "rax", "rbx", "rcx", "rdx", "rsi", "rdi", "r8", "r9", "r10", "r11", "r12", "r13", "r14", "r15" ]; // TODO: complete
	low_registers = [ "al", "bl", "cl", "dl", "sil", "dil", "r8l", "r9l", "r10l", "r11l", "r12l", "r13l", "r14l", "r15l" ]; // TODO: complete

	toLowReg(input: string) {
		return this.low_registers[this.registers.indexOf(input)];
	}

	lookupContext(name: string, sc: StackContext, gc: GlobalContext): StackContext | GlobalContext {
		if (sc.get(name)) {
			return sc;
		} else if (gc.get(name)) {
			return gc;
		} else {
			throw new Error(name + "not found!");
		}
	}

	// generate expression and store result in target
	generateExpression(exp: ParserNode, gc: GlobalContext, sc: StackContext, target: string = this.registers[0]): string {
		let code = "";
		const second_reg = this.registers[this.registers.indexOf(target) + 1];
		switch (exp.id) {
			case ParserNodeType.NUMBER:
				code += `\tmov ${target}, ${exp.value as number}\n`;
				break;
			case ParserNodeType.STRING:
				code += `\tmov ${target}, ${gc.label(exp.value as string, "str")}\n`;
				break;
			case ParserNodeType.COMPARE:
				{
					const third_reg = this.registers[this.registers.indexOf(target) + 2];
					code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
					code += this.generateExpression(exp.b as ParserNode, gc, sc, second_reg);
					switch (exp.value as Compare) {
						case "equals":
							code += `\tcmp ${target}, ${second_reg}\n`;
							code += `\tmov ${third_reg}, 1\n`;
							code += `\tmov ${target}, 0\n`;
							code += `\tcmove ${target}, ${third_reg}\n`;
							break;
						case "less_equals":
							code += `\tcmp ${target}, ${second_reg}\n`;
							code += `\tmov ${third_reg}, 1\n`;
							code += `\tmov ${target}, 0\n`;
							code += `\tcmovle ${target}, ${third_reg}\n`;
							break;
						case "less":
							code += `\tcmp ${target}, ${second_reg}\n`;
							code += `\tmov ${third_reg}, 1\n`;
							code += `\tmov ${target}, 0\n`;
							code += `\tcmovl ${target}, ${third_reg}\n`;
							break;
						default:
							throw new Error("Unsupported " + exp.value);
					}
				}
				break;
			case ParserNodeType.NOT:
				{
					code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
					code += `\tcmp ${target}, 0\n`;
					code += `\tmov ${second_reg}, 1\n`;
					code += `\tmov ${target}, 0\n`;
					code += `\tcmove ${target}, ${second_reg}\n`;
				}
				break;
			case ParserNodeType.ADD:
				code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
				code += this.generateExpression(exp.b as ParserNode, gc, sc, second_reg);
				code += `\tadd ${target}, ${second_reg}\n`;
				break;
			case ParserNodeType.SUBSTRACT:
				code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
				code += this.generateExpression(exp.b as ParserNode, gc, sc, second_reg);
				code += `\tsub ${target}, ${second_reg}\n`;
				break;
			case ParserNodeType.MULTIPLY:
				code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
				code += this.generateExpression(exp.b as ParserNode, gc, sc, second_reg);
				code += `\timul ${target}, ${second_reg}\n`;
				break;
			case ParserNodeType.FUNCTION_CALL:
				{
					const f = exp.value as FunctionCall;

					for (let i = 0; i < this.registers.indexOf(target); i++) {
						code += `\tpush ${this.registers[i]}\n`;
					}

					for (let i = 0; i < f._arguments.length; i++) {
						code += this.generateExpression(f._arguments[i], gc, sc, this.registers[i]);
					}

					code += `\tcall ${f.name}\n`;
					code += `\tmov ${target}, rax\n`;

					for (let i = 0; i < this.registers.indexOf(target); i++) {
						code += `\tpop ${this.registers[this.registers.indexOf(target) - i - 1]}\n`;
					}
				}
				break;
			case ParserNodeType.VARIABLE_LOOKUP:
				{
					if (this.lookupContext(exp.value as string, sc, gc) == sc) {
						code += `\tmov ${target}, [rbp - ${sc.getPtr(exp.value as string)}]\n`;
					} else {
						if (gc.getDatatype(exp.value as string) == "str") {
							code += `\tmov ${target}, ${gc.getPtr(exp.value as string)}\n`;
						} else {
							code += `\tmov ${target}, [${gc.getPtr(exp.value as string)}]\n`;
						}
					}
				}
				break;
			case ParserNodeType.VARIABLE_LOOKUP_ARRAY:
				{
					code += this.generateExpression(exp.a as ParserNode, gc, sc, second_reg);
					if (this.lookupContext(exp.value as string, sc, gc) == sc) {
						code += `\tmov ${target}, [rbp - ${sc.getPtr(exp.value as string)}]\n`;
						const nv = sc.get(exp.value as string) as NamedVariable;
						if (!nv.datatype.array) {
							let third_reg = this.registers[this.registers.indexOf(target) + 2];
							if (third_reg == "rcx") {
								third_reg = "rdx";
							}
							// index the bits!
							code += `\tmov ${third_reg}, 1\n`;
							code += "\tpush rcx\n";
							code += `\tmov rcx, ${second_reg}\n`;
							code += `\tshl ${third_reg}, cl\n`;
							code += "\tpop rcx\n";
							code += `\tand ${target}, ${third_reg}\n`;
						} else {
							const size = sc.get(exp.value as string)?.size() as number;
							code += `\tmov ${target}, [${target} + ${size} * ${second_reg}]\n`;
						}
					} else {
						code += `\tmov ${target}, [${gc.getPtr(exp.value as string)}]\n`;
						const nv = gc.get(exp.value as string) as NamedVariable;
						if (!nv.datatype.array) {
							throw new Error("Bit indexing not supported here!");
						} else {
							const size = gc.get(exp.value as string)?.size() as number;
							code += `\tmov ${target}, [${target} + ${size} * ${second_reg}]\n`;
						}
					}
				}
				break;
			default:
				throw new Error("Unsupported " + exp.id);
		}
		return code;
	}

	generateCodeBlock(f: Function, gc: GlobalContext, sc: StackContext, block: ParserNode[]): string {
		let code = "";
		for (let i = 0; i < block.length; i++) {
			switch (block[i].id) {
				case ParserNodeType.VARIABLE_DECLARATION:
					{
						const d = block[i].value as NamedDatatype;
						sc.register(new NamedVariable(d));

						if (block[i].a) {
					
							switch (d.datatype) {
								case "int":
									code += this.generateExpression(block[i].a as ParserNode, gc, sc);
									code += `\tmov [rbp - ${sc.getPtr(d.name)}], rax\n`;
									break;
								case "str":
									code += this.generateExpression(block[i].a as ParserNode, gc, sc);
									code += `\tmov [rbp - ${sc.getPtr(d.name)}], rax\n`;
									break;
								case "chr":
									code += this.generateExpression(block[i].a as ParserNode, gc, sc);
									code += `\tmov [rbp - ${sc.getPtr(d.name)}], al\n`;
									break;
								default:
									throw new Error("Not supported!");
							}
						}
					}
					break;
				case ParserNodeType.VARIABLE_ASSIGN:
					{
						if (block[i].a) {
							const ctx = this.lookupContext(block[i].value as string, sc, gc);
							if (ctx == sc) {
								switch (sc.getDatatype(block[i].value as string)) {
									case "int":
										code += this.generateExpression(block[i].a as ParserNode, gc, sc);
										code += `\tmov [rbp - ${sc.getPtr(block[i].value as string)}], rax\n`;
										break;
									case "str":
										code += this.generateExpression(block[i].a as ParserNode, gc, sc);
										code += `\tmov [rbp - ${sc.getPtr(block[i].value as string)}], rax\n`;
										break;
									case "chr":
										code += this.generateExpression(block[i].a as ParserNode, gc, sc);
										code += `\tmov [rbp - ${sc.getPtr(block[i].value as string)}], al\n`;
										break;
									default:
										throw new Error("Not supported!");
								}
							} else {
								switch (gc.getDatatype(block[i].value as string)) {
									case "int":
										code += this.generateExpression(block[i].a as ParserNode, gc, sc);
										code += `\tmov [${gc.getPtr(block[i].value as string)}], rax\n`;
										break;
									case "chr":
										code += this.generateExpression(block[i].a as ParserNode, gc, sc);
										code += `\tmov [${gc.getPtr(block[i].value as string)}], al\n`;
										break;
									default:
										throw new Error("Not supported!");
								}
							}
						}
					}
					break;
				case ParserNodeType.VARIABLE_ASSIGN_ARRAY:
					{
						code += this.generateExpression(block[i].a as ParserNode, gc, sc, "rbx");
						code += this.generateExpression(block[i].b as ParserNode, gc, sc, "rcx");

						if (this.lookupContext(block[i].value as string, sc, gc) == sc) {
							const nv = sc.get(block[i].value as string) as NamedVariable;
							if (!nv.datatype.array) {
								throw new Error("Bit assignment not supported");
							}
								
							const size = sc.get(block[i].value as string)?.size() as number;
							code += `\tmov rax, [rbp - ${sc.getPtr(block[i].value as string)}]\n`;
							code += `\tmov [rax + ${size} * rbx], rcx\n`;
						} else {
							const nv = gc.get(block[i].value as string);
							if (!nv.datatype.array) {
								throw new Error("Bit assignment not supported");
							}

							const size = gc.get(block[i].value as string)?.size() as number;

							switch (gc.getDatatype(block[i].value as string)) {
								case "int":
									code += this.generateExpression(block[i].a as ParserNode, gc, sc);
									code += `\tmov rax, [${gc.getPtr(block[i].value as string)}]\n`;
									code += `\tmov [rax + ${size} * rbx], rcx\n`;
									break;
								case "chr":
									code += this.generateExpression(block[i].a as ParserNode, gc, sc);
									code += `\tmov rax, [${gc.getPtr(block[i].value as string)}]\n`;
									code += `\tmov [rax + ${size} * rbx], rcx\n`;
									break;
								default:
									throw new Error("Not supported!");
							} 
						}
					}
					break;
				case ParserNodeType.FUNCTION_CALL:
					{
						const f = block[i].value as FunctionCall;
		
						for (let i = 0; i < f._arguments.length; i++) {
							code += this.generateExpression(f._arguments[i], gc, sc, this.registers[i]);
						}
		
						code += `\tcall ${f.name}\n`;		
					}
					break;
				case ParserNodeType.RETURN:
					code += this.generateExpression(block[i].a as ParserNode, gc, sc);
					code += "\tjmp .out\n";
					break;
				case ParserNodeType.IF:
					{
						code += this.generateExpression(block[i].a as ParserNode, gc, sc);
						const label = sc.label();
						// skip if rax == 0
						code += "\tcmp rax, 0\n";
						code += `\tjz ${label}\n`;
						code += this.generateCodeBlock(f, gc, sc, block[i].value as ParserNode[]);
						code += label + ":\n";
					}
					break;
				case ParserNodeType.CONDITIONAL_LOOP:
					{
						const loop_back_lable = sc.label();
						code += loop_back_lable + ":\n";
						code += this.generateExpression(block[i].a as ParserNode, gc, sc);
						const loop_exit_label = sc.label();
						code += "\tcmp rax, 0\n";
						code += `\tjz ${loop_exit_label}\n`;
						code += this.generateCodeBlock(f, gc, sc, block[i].value as ParserNode[]);
						code += `\tjmp ${loop_back_lable}\n`;
						code += loop_exit_label + ":\n";
					}
					break;
				case ParserNodeType.LOOP:
					{
						const lable = sc.label();
						code += lable + ":\n";
						code += this.generateCodeBlock(f, gc, sc, block[i].value as ParserNode[]);
						code += `\tjmp ${lable}\n`;
					}
					break;
				default:
					throw new Error("Unsupported " + block[i].id);
			}
		}

		return code;
	}

	generateFunction(f: Function, gc: GlobalContext): string {
		const sc = new StackContext();
		let code = "";
		let precode = "";
		let aftercode = "";

		if (f.attributes.includes("global")) {
			precode += `[global ${f.name}]\n`;
		}

		if (f.attributes.includes("assembly")) {
			return precode + f.name + ":\n" + code + f.body[0].value as string;
		} else {
			if (f.attributes.includes("noreturn")) {
				aftercode += `\tcall unreachable\n`;
			} else {
				aftercode += `\tret\n`;
			}
			for (let i = 0; i < f._arguments.length; i++) {
				sc.register(new NamedVariable(f._arguments[i]));
				code += `\tmov [rbp - ${sc.getPtr(f._arguments[i].name)}], ${this.registers[i]}\n`;
			}

			code += this.generateCodeBlock(f, gc, sc, f.body);
		}

		// console.log(sc);

		return precode + f.name + ":\n" + sc.generateBegin() + code + ".out:\n" + sc.generateEnd() + aftercode;
	}

	generate(): string {
		const tmp = this.global.value as ParserNode[];
		
		const gc = new GlobalContext();

		let code = "[bits 64]\n";
		code += "[section .text]\n";

		for (let i = 0; i < tmp.length; i++) {
			switch (tmp[i].id) {
				case ParserNodeType.FUNCTION:
					code += this.generateFunction(tmp[i].value as Function, gc);
					break;
				case ParserNodeType.VARIABLE_DECLARATION:
					if (tmp[i].a) {
						if ((tmp[i].value as NamedDatatype).array) {
							throw new Error("Global array inizializers not supported!");
						}

						if (tmp[i].a?.id == ParserNodeType.STRING || tmp[i].a?.id == ParserNodeType.NUMBER) {
							gc.namedLabel(tmp[i].a?.value, tmp[i].value as NamedDatatype);
						} else {
							throw new Error("Only string and number are supported for globals!");
						}
					} else {
						gc.namedLabel(undefined, tmp[i].value as NamedDatatype);
					}
					break;
				default:
					throw new Error("Unsupported " + tmp[i].id);
			}
		}

		code += gc.generate();

		// console.log(gc);

		return code;
	}
}