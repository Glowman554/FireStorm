import { Compare } from "../features/compare.ts";
import { Datatype, NamedDatatype } from "../features/datatype.ts";
import { Function, FunctionCall } from "../features/function.ts";
import { If } from "../features/if.ts";
import { runCommand } from "../command.ts";
import { ParserNode, ParserNodeType } from "../parser.ts";
import { Target } from "./target.ts";

function dt_to_size(dt: Datatype, array: boolean) {
	switch (dt) {
		case "int":
			return 8;
		case "str":
			return 8; // 8 byte pointer
		case "chr":
			return array ? 8 : 1;
		default:
			throw new Error("Could not get size for " + dt);
	}
}

class NamedVariable {
    datatype: NamedDatatype;

    constructor (datatype: NamedDatatype) {
        this.datatype = datatype;
    }

	size(): number {
		return dt_to_size(this.datatype.datatype, this.datatype.array);
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
	used_functions: string[];
	ptr: number;

	constructor() {
		this.variables = [];
		this.local_labels = [];
		this.used_functions = [];
		this.ptr = 8; // allocate 8 bytes for rbp
	}

	use_function(name: string) {
		if (!this.used_functions.includes(name)) {
			this.used_functions.push(name);
		}
	}

	register(v: NamedVariable) {
		if (this.variables.find((vr) => vr.datatype.name == v.datatype.name)) {
			throw new Error("Already exists");
		}

		this.variables.push(new NamedVariablePtr(v.datatype, this.ptr));
		this.ptr += 8;
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

	get(name: string): NamedVariable | undefined {
		const dt = this.global_labels.find((vr) => vr.name.name == name)?.name as NamedDatatype;
		if (dt) {
			return new NamedVariable(dt);
		} else {
			return undefined;
		}
	} 


	generate(): string {
		let code = "[section .data]\n";
		for (let i = 0; i < this.global_labels.length; i++) {
			switch (this.global_labels[i].name.datatype) {
				case "str":
					code += `${this.global_labels[i].name.name}: db "${this.global_labels[i].val?.replaceAll("\n", "\", 10, \"") || 0}", 0\n`;
					break;
				case "int":
				case "chr":
					code += `${this.global_labels[i].name.name}: dq ${this.global_labels[i].val || 0}\n`;
					break;
				default:
					throw new Error("Unsupported");
			}
		}
		return code;
	}
}

class CompiledFunction {
	code: string;
	name: string;
	used_functions: string[];
	keep: boolean;

	constructor (code: string, name: string, used_functions: string[]) {
		this.code = code;
		this.name = name;
		this.used_functions = used_functions;
		this.keep = false;
	}
}

export class X86_64_Linux implements Target {
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
			throw new Error(name + " not found!");
		}
	}

	resolveFunction(name: string): ParserNode | undefined {
        for (const i of this.global.value as ParserNode[]) {
            if (i.id == "function" && (i.value as Function).name == name) {
                return i;
            }
        }
    }

	generateArrayAccess(write: boolean, ptr: string, idx: string, reg: string, dt: Datatype) {
		if (write) {
			switch (dt) {
				case "int":
					// array needts to be false since we want the size of the elements not of the array ptr
					return `\tmov [${ptr} + ${dt_to_size(dt, false)} * ${idx}], ${reg}\n`;
				case "str":
					return `\tmov [${ptr} + ${dt_to_size(dt, false)} * ${idx}], ${reg}\n`;
				case "chr":
					return `\tmov [${ptr} + ${dt_to_size(dt, false)} * ${idx}], ${this.toLowReg(reg)}\n`;
				default:
					throw new Error("Not supported!");
			} 
		} else {
			switch (dt) {
				case "int":
					return `\tmov ${reg}, [${ptr} + ${dt_to_size(dt, false)} * ${idx}]\n`;
				case "str":
					return `\tmov ${reg}, [${ptr} + ${dt_to_size(dt, false)} * ${idx}]\n`;
				case "chr":
					return `\tmov ${this.toLowReg(reg)}, [${ptr} + ${dt_to_size(dt, false)} * ${idx}]\n\tand ${reg}, 0xff\n`;
				default:
					throw new Error("Not supported!");
			} 
		}
	}

	generateStackVariableAccess(write: boolean, ptr: number, reg: string, dt: NamedDatatype) {
		if (write) {
			switch (dt.datatype) {
				case "int":
					return `\tmov [rbp - ${ptr}], ${reg}\n`;
				case "str":
					return `\tmov [rbp - ${ptr}], ${reg}\n`;
				case "chr":
					if (dt.array) {
						return `\tmov [rbp - ${ptr}], ${reg}\n`;
					} else {
						return `\tmov [rbp - ${ptr}], ${this.toLowReg(reg)}\n`;
					}
				default:
					throw new Error("Not supported!");
			}
		} else {
			switch (dt.datatype) {
				case "int":
					return `\tmov ${reg}, [rbp - ${ptr}]\n`;
				case "str":
					return `\tmov ${reg}, [rbp - ${ptr}]\n`;
				case "chr":
					if (dt.array) {
						return `\tmov ${reg}, [rbp - ${ptr}]\n`;
					} else {
						return `\tmov ${this.toLowReg(reg)}, [rbp - ${ptr}]\n\tand ${reg}, 0xff\n`;
					}
				default:
					throw new Error("Not supported!");
			}
		}
	}

	generateGlobalVariableAccess(write: boolean, ptr: string, reg: string, dt: NamedDatatype) {
		if (write) {
			switch (dt.datatype) {
				case "int":
					return `\tmov [${ptr}], ${reg}\n`;
				case "chr":
					if (dt.array) {
						return `\tmov [${ptr}], ${reg}\n`;
					} else {
						return `\tmov [${ptr}], ${this.toLowReg(reg)}\n`;
					}
				default:
					throw new Error("Not supported!");
			}
		} else {
			switch (dt.datatype) {
				case "int":
					return `\tmov ${reg}, [${ptr}]\n`;
				case "chr":
					if (dt.array) {
						return `\tmov ${reg}, [${ptr}]\n`;
					} else {
						return `\tmov ${this.toLowReg(reg)}, [${ptr}]\n\tand ${reg}, 0xff\n`;
					}
				default:
					throw new Error("Not supported!");
			}
		}
	}

	datatypeToNasmSize(dt: Datatype, array: boolean): string {
		switch (dt) {
			case "int":
				return "qword";
			case "str":
				return "qword";
			case "chr":
				return array ? "qword" : "byte";
			default:
				throw new Error("Not supported!");
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
						case "not_equals":
							code += `\tcmp ${target}, ${second_reg}\n`;
							code += `\tmov ${third_reg}, 1\n`;
							code += `\tmov ${target}, 0\n`;
							code += `\tcmovne ${target}, ${third_reg}\n`;
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
						case "more":
							code += `\tcmp ${target}, ${second_reg}\n`;
							code += `\tmov ${third_reg}, 1\n`;
							code += `\tmov ${target}, 0\n`;
							code += `\tcmovg ${target}, ${third_reg}\n`;
							break;
						case "more_equals":
							code += `\tcmp ${target}, ${second_reg}\n`;
							code += `\tmov ${third_reg}, 1\n`;
							code += `\tmov ${target}, 0\n`;
							code += `\tcmovge ${target}, ${third_reg}\n`;
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
			case ParserNodeType.DIVIDE:
				code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
				code += this.generateExpression(exp.b as ParserNode, gc, sc, second_reg);

				if (target != "rax") code += "\tpush rax\n";
				if (target != "rdx") code += "\tpush rdx\n";
				if (target != "rax") code += `\tmov rax, ${target}\n`;
				code += "\tcqo\n";
				code += `\tidiv ${second_reg}\n`;
				if (target != "rax") code += `\tmov ${target}, rax\n`;
				if (target != "rdx") code += "\tpop rdx\n";
				if (target != "rax") code += "\tpop rax\n";

				break;
			case ParserNodeType.MODULO:
				code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
				code += this.generateExpression(exp.b as ParserNode, gc, sc, second_reg);
	
				if (target != "rax") code += "\tpush rax\n";
				if (target != "rdx") code += "\tpush rdx\n";
				if (target != "rax") code += `\tmov rax, ${target}\n`;
				code += "\tcqo\n";
				code += `\tidiv ${second_reg}\n`;
				if (target != "rdx") code += `\tmov ${target}, rdx\n`;
				if (target != "rdx") code += "\tpop rdx\n";
				if (target != "rax") code += "\tpop rax\n";
	
				break;
			case ParserNodeType.OR:
				code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
				code += this.generateExpression(exp.b as ParserNode, gc, sc, second_reg);
				code += `\tor ${target}, ${second_reg}\n`;
				break;
			case ParserNodeType.AND:
				code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
				code += this.generateExpression(exp.b as ParserNode, gc, sc, second_reg);
				code += `\tand ${target}, ${second_reg}\n`;
				break;
			case ParserNodeType.XOR:
				code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
				code += this.generateExpression(exp.b as ParserNode, gc, sc, second_reg);
				code += `\txor ${target}, ${second_reg}\n`;
				break;
			case ParserNodeType.BIT_NOT:
				code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
				code += `\tnot ${target}\n`;
				break;
			case ParserNodeType.SHIFT_LEFT:
				{
					code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
					code += this.generateExpression(exp.b as ParserNode, gc, sc, second_reg);
					let third_reg = this.registers[this.registers.indexOf(target) + 2];
					if (third_reg == "rcx") {
						third_reg = "rdx";
					}
					if (target == "rcx") {
						code += `\tmov ${third_reg}, ${target}\n`;
						code += "\tpush rcx\n";
						code += `\tmov rcx, ${second_reg}\n`;
						code += `\tshl ${third_reg}, cl\n`;
						code += "\tpop rcx\n";
						code += `\tmov ${target}, ${third_reg}\n`;
					} else {
						code += "\tpush rcx\n";
						code += `\tmov rcx, ${second_reg}\n`;
						code += `\tshl ${target}, cl\n`;
						code += "\tpop rcx\n";
					}
				}
				break;
			case ParserNodeType.SHIFT_RIGHT:
				{
					code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
					code += this.generateExpression(exp.b as ParserNode, gc, sc, second_reg);
					let third_reg = this.registers[this.registers.indexOf(target) + 2];
					if (third_reg == "rcx") {
						third_reg = "rdx";
					}
					if (target == "rcx") {
						code += `\tmov ${third_reg}, ${target}\n`;
						code += "\tpush rcx\n";
						code += `\tmov rcx, ${second_reg}\n`;
						code += `\tshr ${third_reg}, cl\n`;
						code += "\tpop rcx\n";
						code += `\tmov ${target}, ${third_reg}\n`;
					} else {
						code += "\tpush rcx\n";
						code += `\tmov rcx, ${second_reg}\n`;
						code += `\tshr ${target}, cl\n`;
						code += "\tpop rcx\n";
					}
				}
				break;
			case ParserNodeType.FUNCTION_CALL:
				{
					const fc = exp.value as FunctionCall;
					sc.use_function(fc.name);

					for (let i = 0; i < this.registers.indexOf(target); i++) {
						code += `\tpush ${this.registers[i]}\n`;
					}

					for (let i = 0; i < fc._arguments.length; i++) {
						code += this.generateExpression(fc._arguments[i], gc, sc, this.registers[i]);
					}

					const f = this.resolveFunction(fc.name)?.value as Function | undefined;
					if (f) {
						if (f._arguments.length != fc._arguments.length) {
							throw new Error("To manny or not enough arguments!");
						}
					} else {
						throw new Error("Function " + fc.name + " not found!");
					}

					code += `\tcall ${fc.name}\n`;
					code += `\tmov ${target}, rax\n`;

					for (let i = 0; i < this.registers.indexOf(target); i++) {
						code += `\tpop ${this.registers[this.registers.indexOf(target) - i - 1]}\n`;
					}
				}
				break;
			case ParserNodeType.VARIABLE_LOOKUP:
				{
					const func = this.resolveFunction(exp.value as string);
					if (func) {
						code += `\tmov ${target}, ${exp.value}\n`;
					} else {
						if (this.lookupContext(exp.value as string, sc, gc) == sc) {
							code += this.generateStackVariableAccess(false, sc.getPtr(exp.value as string) as number, target, (sc.get(exp.value as string) as NamedVariable).datatype);
						} else {
							if (gc.getDatatype(exp.value as string) == "str") {
								code += `\tmov ${target}, ${gc.getPtr(exp.value as string)}\n`;
							} else {
								// console.log(exp);
								code += this.generateGlobalVariableAccess(false, gc.getPtr(exp.value as string) as string, target, (gc.get(exp.value as string) as NamedVariable).datatype);
							}
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
							code += this.generateArrayAccess(false, target, second_reg, target, sc.getDatatype(exp.value as string) as Datatype);
						}
					} else {
						code += `\tmov ${target}, [${gc.getPtr(exp.value as string)}]\n`;
						const nv = gc.get(exp.value as string) as NamedVariable;
						if (!nv.datatype.array) {
							throw new Error("Bit indexing not supported here!");
						} else {
							code += this.generateArrayAccess(false, target, second_reg, target, gc.getDatatype(exp.value as string) as Datatype);
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
							code += this.generateExpression(block[i].a as ParserNode, gc, sc);
							code += this.generateStackVariableAccess(true, sc.getPtr(d.name) as number, "rax", d);
						}
					}
					break;
				case ParserNodeType.VARIABLE_ASSIGN:
					{
						if (block[i].a) {
							const ctx = this.lookupContext(block[i].value as string, sc, gc);
							code += this.generateExpression(block[i].a as ParserNode, gc, sc);

							if (ctx == sc) {
								code += this.generateStackVariableAccess(true, sc.getPtr(block[i].value as string) as number, "rax", (sc.get(block[i].value as string) as NamedVariable).datatype);
							} else {
								code += this.generateGlobalVariableAccess(true, gc.getPtr(block[i].value as string) as string, "rax", (gc.get(block[i].value as string) as NamedVariable).datatype);
							}
						}
					}
					break;
				case ParserNodeType.VARIABLE_INCREASE:
					{
						const ctx = this.lookupContext(block[i].value as string, sc, gc);

						if (ctx == sc) {
							code += `\tinc ${this.datatypeToNasmSize(sc.getDatatype(block[i].value as string) as Datatype, (sc.get(block[i].value as string) as NamedVariable).datatype.array)} [rbp - ${sc.getPtr(block[i].value as string)}]\n`;
						} else {
							code += `\tinc ${this.datatypeToNasmSize(gc.getDatatype(block[i].value as string) as Datatype, (gc.get(block[i].value as string) as NamedVariable).datatype.array)} [${gc.getPtr(block[i].value as string)}]\n`;
						}
					}
					break;
				case ParserNodeType.VARIABLE_DECREASE:
					{
						const ctx = this.lookupContext(block[i].value as string, sc, gc);
	
						if (ctx == sc) {
							code += `\tdec ${this.datatypeToNasmSize(sc.getDatatype(block[i].value as string) as Datatype, (sc.get(block[i].value as string) as NamedVariable).datatype.array)} [rbp - ${sc.getPtr(block[i].value as string)}]\n`;
						} else {
							code += `\tdec ${this.datatypeToNasmSize(gc.getDatatype(block[i].value as string) as Datatype, (gc.get(block[i].value as string) as NamedVariable).datatype.array)} [${gc.getPtr(block[i].value as string)}]\n`;
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

							code += `\tmov rax, [rbp - ${sc.getPtr(block[i].value as string)}]\n`;
							code += this.generateArrayAccess(true, "rax", "rbx", "rcx", sc.getDatatype(block[i].value as string) as Datatype);
						} else {
							const nv = gc.get(block[i].value as string);
							if (!nv) {
								throw new Error("Could not find " + block[i].value);
							}
							if (!nv.datatype.array) {
								throw new Error("Bit assignment not supported");
							}

							code += `\tmov rax, [${gc.getPtr(block[i].value as string)}]\n`;
							code += this.generateArrayAccess(true, "rax", "rbx", "rcx", gc.getDatatype(block[i].value as string) as Datatype);
						}

					}
					break;
				case ParserNodeType.FUNCTION_CALL:
					{
						const fc = block[i].value as FunctionCall;
						sc.use_function(fc.name);
		
						for (let i = 0; i < fc._arguments.length; i++) {
							code += this.generateExpression(fc._arguments[i], gc, sc, this.registers[i]);
						}

						const f = this.resolveFunction(fc.name)?.value as Function | undefined;
						if (f) {
							if (f._arguments.length != fc._arguments.length) {
								throw new Error("To manny or not enough arguments!");
							}
						} else {
							throw new Error("Function " + fc.name + " not found!");
						}
		
						code += `\tcall ${fc.name}\n`;		
					}
					break;
				case ParserNodeType.RETURN:
					if (block[i].a) {
						code += this.generateExpression(block[i].a as ParserNode, gc, sc);
					}
					code += "\tjmp .out\n";
					break;
				case ParserNodeType.IF:
					{
						code += this.generateExpression(block[i].a as ParserNode, gc, sc);
						const iff = block[i].value as If;
						const label = sc.label();
						if (iff.false_block) {
							const label2 = sc.label();
							// skip if rax == 0
							code += "\tcmp rax, 0\n";
							code += `\tjz ${label}\n`;
							code += this.generateCodeBlock(f, gc, sc, iff.true_block);
							code += `\tjmp ${label2}\n`;
							code += label + ":\n";
							code += this.generateCodeBlock(f, gc, sc, iff.false_block);
							code += label2 + ":\n";
						} else {
							// skip if rax == 0
							code += "\tcmp rax, 0\n";
							code += `\tjz ${label}\n`;
							code += this.generateCodeBlock(f, gc, sc, iff.true_block);
							code += label + ":\n";
						}
					}
					break;
				case ParserNodeType.CONDITIONAL_LOOP:
					{
						const loop_back_label = sc.label();
						code += loop_back_label + ":\n";
						code += this.generateExpression(block[i].a as ParserNode, gc, sc);
						const loop_exit_label = sc.label();
						code += "\tcmp rax, 0\n";
						code += `\tjz ${loop_exit_label}\n`;
						code += this.generateCodeBlock(f, gc, sc, block[i].value as ParserNode[]);
						code += `\tjmp ${loop_back_label}\n`;
						code += loop_exit_label + ":\n";
					}
					break;
				case ParserNodeType.POST_CONDITIONAL_LOOP:
					{
						const loop_back_label = sc.label();
						code += loop_back_label + ":\n";
						code += this.generateCodeBlock(f, gc, sc, block[i].value as ParserNode[]);
						code += this.generateExpression(block[i].a as ParserNode, gc, sc);
						code += "\tcmp rax, 0\n";
						code += `\tjnz ${loop_back_label}\n`;
					}
					break;
				case ParserNodeType.LOOP:
					{
						const label = sc.label();
						code += label + ":\n";
						code += this.generateCodeBlock(f, gc, sc, block[i].value as ParserNode[]);
						code += `\tjmp ${label}\n`;
					}
					break;
				default:
					throw new Error("Unsupported " + block[i].id);
			}
		}

		return code;
	}

	generateFunction(f: Function, gc: GlobalContext) {
		const sc = new StackContext();
		let code = "";
		let precode = "";
		let aftercode = "";

		if (f.attributes.includes("global")) {
			precode += `[global ${f.name}]\n`;
		}

		if (f.attributes.includes("assembly")) {
			return { code: precode + f.name + ":\n" + code + f.body[0].value as string, sc };
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

		return { code: precode + f.name + ":\n" + sc.generateBegin() + code + ".out:\n" + sc.generateEnd() + aftercode, sc };
	}

	keepFunction(functions: CompiledFunction[], name: string) {
		const f = functions.find(v => v.name == name) as CompiledFunction;
		
		if (f.keep) {
			return; // do not cause loops
		}

		f.keep = true;
		for (let i = 0; i < f.used_functions.length; i++) {
			this.keepFunction(functions, f.used_functions[i]);
		}
	}

	generate(): string {
		const tmp = this.global.value as ParserNode[];
		
		const gc = new GlobalContext();

		let code = "[bits 64]\n";
		code += "[section .text]\n";

		let functions: CompiledFunction[] = [];

		for (let i = 0; i < tmp.length; i++) {
			switch (tmp[i].id) {
				case ParserNodeType.FUNCTION:
					{
						const { code, sc } = this.generateFunction(tmp[i].value as Function, gc);
						functions.push(new CompiledFunction(code, (tmp[i].value as Function).name, sc.used_functions));
					}
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

		for (let i = 0; i < tmp.length; i++) {
			switch (tmp[i].id) {
				case ParserNodeType.FUNCTION:
					{
						if ((tmp[i].value as Function).attributes.includes("keep")) {
							this.keepFunction(functions, (tmp[i].value as Function).name);
						}
					}
					break;
			}
		}

		if (functions.find(v => v.name == "spark")) {
			this.keepFunction(functions, "spark");
		}

		for (let i = 0; i < functions.length; i++) {
			if (functions[i].keep) {
				code += functions[i].code;
			}
			// else {
			// 	console.log("Removing unused function " + functions[i].name);
			// }
		}

		code += gc.generate();

		return code;
	}

	async compile(mode: string, output: string, generated: string): Promise<void> {
		switch (mode) {
			case "asm":
				Deno.writeTextFileSync(output, generated);
				break;
			case "o":
				Deno.writeTextFileSync(output + ".asm", generated);
				await runCommand(`nasm ${output + ".asm"} -felf64 -o ${output} -g`);
				break;
			case "elf":
				Deno.writeTextFileSync(output + ".asm", generated);
				await runCommand(`nasm ${output + ".asm"} -felf64 -o ${output + ".o"} -g`);
				await runCommand(`gcc ${output + ".o"} -o ${output} --static -fno-pie -g`);
				break;
			default:
				throw new Error("Mode " + mode + " not found!");
		}
	}
}