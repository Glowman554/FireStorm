import { Compare } from "../features/compare.ts";
import { Datatype, NamedDatatype } from "../features/datatype.ts";
import { Function, FunctionCall } from "../features/function.ts";
import { ParserNode, ParserNodeType } from "../parser.ts";

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

	generateBegin(): string {
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


	generate(): string {
		let code = "[section .data]\n";
		for (let i = 0; i < this.global_labels.length; i++) {
			switch (this.global_labels[i].name.datatype) {
				case "str":
					code += `${this.global_labels[i].name.name}: db "${this.global_labels[i].val}", 0\n`;
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
							code += `\tmov ${third_reg}, 0\n`;
							code += `\tmov ${target}, 1\n`;
							code += `\tcmovne ${target}, ${third_reg}\n`;
							break;
						default:
							throw new Error("Unsupported " + exp.value);
					}
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
					code += `\tmov ${target}, [rbp - ${sc.getPtr(exp.value as string)}]\n`;
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
								default:
									throw new Error("Not supported!");
							}
						}
					}
					break;
				case ParserNodeType.VARIABLE_ASSIGN:
					{
						if (block[i].a) {
							switch (sc.getDatatype(block[i].value as string)) {
								case "int":
									code += this.generateExpression(block[i].a as ParserNode, gc, sc);
									code += `\tmov [rbp - ${sc.getPtr(block[i].value as string)}], rax\n`;
									break;
								case "str":
									code += this.generateExpression(block[i].a as ParserNode, gc, sc);
									code += `\tmov [rbp - ${sc.getPtr(block[i].value as string)}], rax\n`;
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

		if (f.attributes.includes("global")) {
			precode += `[global ${f.name}]\n`;
		}

		if (f.attributes.includes("assembly")) {
			return precode + f.name + ":\n" + code + f.body[0].value as string;
		} else {
			for (let i = 0; i < f._arguments.length; i++) {
				sc.register(new NamedVariable(f._arguments[i]));
				code += `\tmov [rbp - ${sc.getPtr(f._arguments[i].name)}], ${this.registers[i]}\n`;
			}

			code += this.generateCodeBlock(f, gc, sc, f.body);
		}

		console.log(sc);

		return precode + f.name + ":\n" + sc.generateBegin() + code + ".out:\n" + sc.generateEnd() + "\tret\n";
	}

	generate(): string {
		const tmp = this.global.value as ParserNode[];
		
		const gc = new GlobalContext();

		let code = "[section .code]\n";

		for (let i = 0; i < tmp.length; i++) {
			switch (tmp[i].id) {
				case ParserNodeType.FUNCTION:
					code += this.generateFunction(tmp[i].value as Function, gc);
					break;
				default:
					throw new Error("Unsupported " + tmp[i].id);
			}
		}

		code += gc.generate();

		console.log(gc);

		return code;
	}
}