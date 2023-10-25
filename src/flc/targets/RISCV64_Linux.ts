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
	name: string;

	constructor(name: string) {
		this.variables = [];
		this.local_labels = [];
		this.used_functions = [];
		this.ptr = 8; // allocate 8 bytes for rbp
		this.name = name;
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
		const label = `${this.name}_${this.local_labels.length}`;
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
		return "\taddi sp, sp, -" + this.ptr + "\n\tsd ra, (sp)\n";
	}

	generateEnd(): string {
		return "\tld ra, (sp)\n\taddi sp, sp, " + this.ptr + "\n";
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
		let code = ".data\n";
		for (let i = 0; i < this.global_labels.length; i++) {
			switch (this.global_labels[i].name.datatype) {
				case "str":
					code += `${this.global_labels[i].name.name}: .string "${this.global_labels[i].val}"\n`;
					break;
				case "int":
				case "chr":
					code += `${this.global_labels[i].name.name}: .quad ${this.global_labels[i].val || 0}\n`;
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

export class RISCV64_Linux implements Target {
    global: ParserNode;

    constructor (global: ParserNode) {
        this.global = global;
	}

	registers = [ "x5", "x6", "x7", "x8", "x9", "x10", "x11", "x12", "x13", "x14", "x15", "x16", "x17", "x18" ]; // TODO: complete


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
            if ((i.value as Function).name == name) {
                return i;
            }
        }
    }

	generateArrayAccess(write: boolean, ptr: string, idx: string, reg: string, dt: Datatype) {
		if (write) {
			switch (dt) {
				case "int":
					// array needts to be false since we want the size of the elements not of the array ptr
					return `\tli x30, ${dt_to_size(dt, false)}\n\tmul x31, ${idx}, x30\n\tadd x31, x31, ${ptr}\n\tsd ${reg}, (x31)\n`;
				case "str":
					return `\tli x30, ${dt_to_size(dt, false)}\n\tmul x31, ${idx}, x30\n\tadd x31, x31, ${ptr}\n\tsd ${reg}, (x31)\n`;
				case "chr":
					return `\tli x30, ${dt_to_size(dt, false)}\n\tmul x31, ${idx}, x30\n\tadd x31, x31, ${ptr}\n\tsb ${reg}, (x31)\n`;
				default:
					throw new Error("Not supported!");
			} 
		} else {
			switch (dt) {
				case "int":
					return `\tli x30, ${dt_to_size(dt, false)}\n\tmul x31, ${idx}, x30\n\tadd x31, x31, ${ptr}\n\tld ${reg}, (x31)\n`;
				case "str":
					return `\tli x30, ${dt_to_size(dt, false)}\n\tmul x31, ${idx}, x30\n\tadd x31, x31, ${ptr}\n\tld ${reg}, (x31)\n`;
				case "chr":
					return `\tli x30, ${dt_to_size(dt, false)}\n\tmul x31, ${idx}, x30\n\tadd x31, x31, ${ptr}\n\tlb ${reg}, (x31)\n`;
				default:
					throw new Error("Not supported!");
			} 
		}
	}

	generateStackVariableAccess(write: boolean, ptr: number, reg: string, dt: NamedDatatype) {
		if (write) {
			switch (dt.datatype) {
				case "int":
					return `\tsd ${reg}, ${ptr}(sp)\n`;
				case "str":
					return `\tsd ${reg}, ${ptr}(sp)\n`;
				case "chr":
					if (dt.array) {
						return `\tsd ${reg}, ${ptr}(sp)\n`;
					} else {
						return `\tsb ${reg}, ${ptr}(sp)\n`;
					}
				default:
					throw new Error("Not supported!");
			}
		} else {
			switch (dt.datatype) {
				case "int":
					return `\tld ${reg}, ${ptr}(sp)\n`;
				case "str":
					return `\tld ${reg}, ${ptr}(sp)\n`;
				case "chr":
					if (dt.array) {
						return `\tld ${reg}, ${ptr}(sp)\n`;
					} else {
						return `\tlb ${reg}, ${ptr}(sp)\n`;
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
					return `\tla x31, ${ptr}\n\tsd ${reg}, (x31)\n`;
				case "chr":
					if (dt.array) {
						return `\tla x31, ${ptr}\n\tsd ${reg}, (x31)\n`;
					} else {
						return `\tla x31, ${ptr}\n\tsb ${reg}, (x31)\n`;
					}
				default:
					throw new Error("Not supported!");
			}
		} else {
			switch (dt.datatype) {
				case "int":
					return `\tla x31, ${ptr}\n\tld ${reg}, (x31)\n`;
				case "chr":
					if (dt.array) {
						return `\tla x31, ${ptr}\n\tld ${reg}, (x31)\n`;
					} else {
						return `\tla x31, ${ptr}\n\tlb ${reg}, (x31)\n`;
					}
				default:
					throw new Error("Not supported!");
			}
		}
	}

	// generate expression and store result in target
	generateExpression(exp: ParserNode, gc: GlobalContext, sc: StackContext, target: string = this.registers[0]): string {
		let code = "";
		const second_reg = this.registers[this.registers.indexOf(target) + 1];
		switch (exp.id) {
			case ParserNodeType.NUMBER:
				code += `\tli ${target}, ${exp.value as number}\n`; // TODO maybe addi ..., x0, ...
				break;
			case ParserNodeType.STRING:
				code += `\tla ${target}, ${gc.label(exp.value as string, "str")}\n`;
				break;
			case ParserNodeType.COMPARE:
				{
					const third_reg = this.registers[this.registers.indexOf(target) + 2];
					code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
					code += this.generateExpression(exp.b as ParserNode, gc, sc, second_reg);
					const label = sc.label();
					switch (exp.value as Compare) {
						case "equals":
							code += `\tli ${third_reg}, 1\n`;
							code += `\tbeq ${target}, ${second_reg}, ${label}\n`;
							code += `\tli ${third_reg}, 0\n`;
							code += `${label}:\n`;
							code += `\tmv ${target}, ${third_reg}\n`;
							break;
						case "not_equals":
							code += `\tli ${third_reg}, 1\n`;
							code += `\tbne ${target}, ${second_reg}, ${label}\n`;
							code += `\tli ${third_reg}, 0\n`;
							code += `${label}:\n`;
							code += `\tmv ${target}, ${third_reg}\n`;
							break;
						case "less_equals":
							code += `\tli ${third_reg}, 1\n`;
							code += `\tble ${target}, ${second_reg}, ${label}\n`;
							code += `\tli ${third_reg}, 0\n`;
							code += `${label}:\n`;
							code += `\tmv ${target}, ${third_reg}\n`;
							break;
						case "less":
							code += `\tli ${third_reg}, 1\n`;
							code += `\tblt ${target}, ${second_reg}, ${label}\n`;
							code += `\tli ${third_reg}, 0\n`;
							code += `${label}:\n`;
							code += `\tmv ${target}, ${third_reg}\n`;
							break;
						case "more":
							code += `\tli ${third_reg}, 1\n`;
							code += `\tbgt ${target}, ${second_reg}, ${label}\n`;
							code += `\tli ${third_reg}, 0\n`;
							code += `${label}:\n`;
							code += `\tmv ${target}, ${third_reg}\n`;
							break;
						case "more_equals":
							code += `\tli ${third_reg}, 1\n`;
							code += `\tbge ${target}, ${second_reg}, ${label}\n`;
							code += `\tli ${third_reg}, 0\n`;
							code += `${label}:\n`;
							code += `\tmv ${target}, ${third_reg}\n`;
							break;
						default:
							throw new Error("Unsupported " + exp.value);
					}
				}
				break;
			case ParserNodeType.NOT:
				{
					const label = sc.label();

					code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
					code += `\tli ${second_reg}, 1\n`;
					code += `\tbeqz ${target}, ${label}\n`;
					code += `\tli ${second_reg}, 0\n`;
					code += `${label}:\n`;
					code += `\tmv ${target}, ${second_reg}\n`;
				}
				break;
			case ParserNodeType.ADD:
				code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
				code += this.generateExpression(exp.b as ParserNode, gc, sc, second_reg);
				code += `\tadd ${target}, ${target}, ${second_reg}\n`;
				break;
			case ParserNodeType.SUBSTRACT:
				code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
				code += this.generateExpression(exp.b as ParserNode, gc, sc, second_reg);
				code += `\tsub ${target}, ${target}, ${second_reg}\n`;
				break;
			case ParserNodeType.MULTIPLY:
				code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
				code += this.generateExpression(exp.b as ParserNode, gc, sc, second_reg);
				code += `\tmul ${target}, ${target}, ${second_reg}\n`;
				break;
			case ParserNodeType.DIVIDE:
				code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
				code += this.generateExpression(exp.b as ParserNode, gc, sc, second_reg);
				code += `\tdiv ${target}, ${target}, ${second_reg}\n`;
				break;
			case ParserNodeType.MODULO:
				code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
				code += this.generateExpression(exp.b as ParserNode, gc, sc, second_reg);
				code += `\trem ${target}, ${target}, ${second_reg}\n`;
				break;
			case ParserNodeType.OR:
				code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
				code += this.generateExpression(exp.b as ParserNode, gc, sc, second_reg);
				code += `\tor ${target}, ${target}, ${second_reg}\n`;
				break;
			case ParserNodeType.AND:
				code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
				code += this.generateExpression(exp.b as ParserNode, gc, sc, second_reg);
				code += `\tand ${target}, ${target}, ${second_reg}\n`;
				break;
			case ParserNodeType.XOR:
				code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
				code += this.generateExpression(exp.b as ParserNode, gc, sc, second_reg);
				code += `\txor ${target}, ${target}, ${second_reg}\n`;
				break;
			case ParserNodeType.BIT_NOT:
				code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
				code += `\tnot ${target}, ${target}\n`;
				break;
			case ParserNodeType.SHIFT_LEFT:
				{
					code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
					code += this.generateExpression(exp.b as ParserNode, gc, sc, second_reg);
					code += `\tsll ${target}, ${target}, ${second_reg}\n`;
				}
				break;
			case ParserNodeType.SHIFT_RIGHT:
				{
					code += this.generateExpression(exp.a as ParserNode, gc, sc, target);
					code += this.generateExpression(exp.b as ParserNode, gc, sc, second_reg);
					code += `\srl ${target}, ${target}, ${second_reg}\n`;
				}
				break;
			case ParserNodeType.FUNCTION_CALL:
				{
					const fc = exp.value as FunctionCall;
					sc.use_function(fc.name);

					code += `\taddi x31, sp, -${this.registers.indexOf(target) * 8}\n`;

					for (let i = 0; i < this.registers.indexOf(target); i++) {
						code += `\tsd ${this.registers[i]}, ${i * 8}(x31)\n`;
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

					code += `\taddi sp, sp, -${this.registers.indexOf(target) * 8}\n`;
					code += `\tcall ${fc.name}\n`;
					code += `\tmv ${target}, x5\n`;

					for (let i = 0; i < this.registers.indexOf(target); i++) {
						code += `\tld ${this.registers[i]}, ${i * 8}(sp)\n`;
					}

					code += `\taddi sp, sp, ${this.registers.indexOf(target) * 8}\n`;
				}
				break;
			case ParserNodeType.VARIABLE_LOOKUP:
				{
					if (this.lookupContext(exp.value as string, sc, gc) == sc) {
						code += this.generateStackVariableAccess(false, sc.getPtr(exp.value as string) as number, target, (sc.get(exp.value as string) as NamedVariable).datatype);
					} else {
						if (gc.getDatatype(exp.value as string) == "str") {
							code += `\tla ${target}, ${gc.getPtr(exp.value as string)}\n`;
						} else {
							// console.log(exp);
							code += this.generateGlobalVariableAccess(false, gc.getPtr(exp.value as string) as string, target, (gc.get(exp.value as string) as NamedVariable).datatype);
						}
					}
				}
				break;
			case ParserNodeType.VARIABLE_LOOKUP_ARRAY:
				{
					code += this.generateExpression(exp.a as ParserNode, gc, sc, second_reg);
					if (this.lookupContext(exp.value as string, sc, gc) == sc) {
						code += `\tld ${target}, ${sc.getPtr(exp.value as string)}(sp)\n`;
						const nv = sc.get(exp.value as string) as NamedVariable;
						if (!nv.datatype.array) {
							const third_reg = this.registers[this.registers.indexOf(target) + 2];
	
							// index the bits!
							code += `\tli ${third_reg}, 1\n`;
							code += `\tsll ${third_reg}, ${third_reg}, ${second_reg}\n`;
							code += `\tand ${target}, ${target}, ${third_reg}\n`;

						} else {
							code += this.generateArrayAccess(false, target, second_reg, target, sc.getDatatype(exp.value as string) as Datatype);
						}
					} else {
						code += `\tla x31, ${gc.getPtr(exp.value as string)}\n\tld ${target}, (x31)\n`;
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
							code += this.generateStackVariableAccess(true, sc.getPtr(d.name) as number, "x5", d);
						}
					}
					break;
				case ParserNodeType.VARIABLE_ASSIGN:
					{
						if (block[i].a) {
							const ctx = this.lookupContext(block[i].value as string, sc, gc);
							code += this.generateExpression(block[i].a as ParserNode, gc, sc);

							if (ctx == sc) {
								code += this.generateStackVariableAccess(true, sc.getPtr(block[i].value as string) as number, "x5", (sc.get(block[i].value as string) as NamedVariable).datatype);
							} else {
								code += this.generateGlobalVariableAccess(true, gc.getPtr(block[i].value as string) as string, "x5", (gc.get(block[i].value as string) as NamedVariable).datatype);
							}
						}
					}
					break;
				case ParserNodeType.VARIABLE_INCREASE:
					{
						const ctx = this.lookupContext(block[i].value as string, sc, gc);

						if (ctx == sc) {
							code += `\tld x31, ${sc.getPtr(block[i].value as string)}(sp)\n`;
							code += `\taddi x31, x31, 1\n`;
							code += `\tsd x31, ${sc.getPtr(block[i].value as string)}(sp)\n`;
						} else {
							throw new Error("No");
						}
					}
					break;
				case ParserNodeType.VARIABLE_DECREASE:
					{
						const ctx = this.lookupContext(block[i].value as string, sc, gc);
	
						if (ctx == sc) {
							code += `\tld x31, ${sc.getPtr(block[i].value as string)}(sp)\n`;
							code += `\taddi x31, x31, -1\n`;
							code += `\tsd x31, ${sc.getPtr(block[i].value as string)}(sp)\n`;
						} else {
							throw new Error("No");
						}
					}
					break;
				case ParserNodeType.VARIABLE_ASSIGN_ARRAY:
					{
						code += this.generateExpression(block[i].a as ParserNode, gc, sc, "x6");
						code += this.generateExpression(block[i].b as ParserNode, gc, sc, "x7");

						if (this.lookupContext(block[i].value as string, sc, gc) == sc) {
							const nv = sc.get(block[i].value as string) as NamedVariable;
							if (!nv.datatype.array) {
								throw new Error("Bit assignment not supported");
							}

							code += `\tld x5, ${sc.getPtr(block[i].value as string)}(sp)\n`;
							code += this.generateArrayAccess(true, "x5", "x6", "x7", sc.getDatatype(block[i].value as string) as Datatype);
						} else {
							const nv = gc.get(block[i].value as string);
							if (!nv) {
								throw new Error("Could not find " + block[i].value);
							}
							if (!nv.datatype.array) {
								throw new Error("Bit assignment not supported");
							}

							code += `\tla x31, ${gc.getPtr(block[i].value as string)}\nld x5, (x31)\n`;
							code += this.generateArrayAccess(true, "x5", "x6", "x7", gc.getDatatype(block[i].value as string) as Datatype);
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
					code += "\tj " + sc.name + "_out\n";
					break;
				case ParserNodeType.IF:
					{
						code += this.generateExpression(block[i].a as ParserNode, gc, sc);
						const iff = block[i].value as If;
						const label = sc.label();
						if (iff.false_block) {
							const label2 = sc.label();
							// skip if rax == 0
							code += `\tbeqz x5, ${label}\n`;
							code += this.generateCodeBlock(f, gc, sc, iff.true_block);
							code += `\tj ${label2}\n`;
							code += label + ":\n";
							code += this.generateCodeBlock(f, gc, sc, iff.false_block);
							code += label2 + ":\n";
						} else {
							// skip if rax == 0
							code += `\tbeqz x5, ${label}\n`;
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
						code += `\tbeqz x5, ${loop_exit_label}\n`;
						code += this.generateCodeBlock(f, gc, sc, block[i].value as ParserNode[]);
						code += `\tj ${loop_back_label}\n`;
						code += loop_exit_label + ":\n";
					}
					break;
				case ParserNodeType.POST_CONDITIONAL_LOOP:
					{
						const loop_back_label = sc.label();
						code += loop_back_label + ":\n";
						code += this.generateCodeBlock(f, gc, sc, block[i].value as ParserNode[]);
						code += this.generateExpression(block[i].a as ParserNode, gc, sc);
						code += `\tbnez x5, ${loop_back_label}\n`;
					}
					break;
				case ParserNodeType.LOOP:
					{
						const label = sc.label();
						code += label + ":\n";
						code += this.generateCodeBlock(f, gc, sc, block[i].value as ParserNode[]);
						code += `\tj ${label}\n`;
					}
					break;
				default:
					throw new Error("Unsupported " + block[i].id);
			}
		}

		return code;
	}

	generateFunction(f: Function, gc: GlobalContext) {
		const sc = new StackContext(f.name);
		let code = "";
		let precode = "";
		let aftercode = "";

		if (f.attributes.includes("global")) {
			precode += `.global ${f.name}\n`;
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
				code += `\tsd ${this.registers[i]}, ${sc.getPtr(f._arguments[i].name)}(sp)\n`;
			}

			code += this.generateCodeBlock(f, gc, sc, f.body);
		}

		// console.log(sc);

		return { code: precode + f.name + ":\n" + sc.generateBegin() + code + f.name + "_out:\n" + sc.generateEnd() + aftercode, sc };
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

		let code = ".text\n";

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
				Deno.writeTextFileSync(output + ".S", generated);
				await runCommand(`riscv64-linux-gnu-as ${output + ".S"} -o ${output} -g`);
				break;
			case "elf":
				Deno.writeTextFileSync(output + ".S", generated);
				await runCommand(`riscv64-linux-gnu-as ${output + ".S"} -o ${output + ".o"} -g`);
				await runCommand(`riscv64-linux-gnu-gcc ${output + ".o"} -o ${output} --static -fno-pie -g`);
				break;
			default:
				throw new Error("Mode " + mode + " not found!");
		}
	}
}