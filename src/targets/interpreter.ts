// deno-lint-ignore-file no-explicit-any
import { Compare } from "../features/compare.ts";
import { NamedDatatype, UnnamedDatatype } from "../features/datatype.ts";
import { Function, FunctionCall } from "../features/function.ts";
import { If } from "../features/if.ts";
import { ParserNode, ParserNodeType } from "../parser.ts";

class NamedVariable {
    datatype: NamedDatatype;
	val: any;

    constructor (datatype: NamedDatatype, val: any) {
        this.datatype = datatype;
		this.val = val;
    }

	check(other: UnnamedDatatype) {
        return other.array == this.datatype.array && other.datatype == this.datatype.datatype;
    }
}

class UnnamedVariable {
    datatype: UnnamedDatatype;
	val: any;

    constructor (datatype: UnnamedDatatype, val: any) {
        this.datatype = datatype;
		this.val = val;
    }

	check(other: UnnamedDatatype) {
        return other.array == this.datatype.array && other.datatype == this.datatype.datatype;
	}

}

class Memory {
	memory: Uint32Array;
	bitmap: Uint32Array;
	strings: { str: string, ptr: number }[];
	allocations: { ptr: number, size: number }[];

	constructor () {
		this.memory = new Uint32Array(1024); // TODO make this dynamic
		this.bitmap = new Uint32Array(1024 / 32);

		this.strings = [];
		this.allocations = [];
	}

	bitmapGet(idx: number): boolean {
		return Boolean(this.bitmap[Math.floor(idx / 32)] & 1 << (idx % 32));
	}

	bitmapeSet(idx: number, val: boolean) {
		if (val) {
			this.bitmap[Math.floor(idx / 32)] |= 1 << (idx % 32);
		} else {
			this.bitmap[Math.floor(idx / 32)] &= ~(1 << (idx % 32));
		}
	}

	bitmapeSetRange(idx: number, range: number, val: boolean) {
		for (let i = 0; i < range; i++) {
			this.bitmapeSet(idx + i, val);
		}
	}

	bitmapeCheckRange(idx: number, range: number, expected: boolean): boolean {
		for (let i = 0; i < range; i++) {
			if (this.bitmapGet(idx + i) != expected) {
				return false;
			}
		}
		return true;
	}


	allocate(length: number) {
		for (let x = 0; x < this.memory.length; x++) {
			if (this.bitmapGet(x)) {
				continue;
			}
	
			if (this.bitmapeCheckRange(x, length, false)) {
				this.bitmapeSetRange(x, length, true);
				this.allocations.push({
					ptr: x,
					size: length
				});
				return x;
			}
		}
	
	
		throw new Error("Out of memory!");
	}

	deallocate(ptr: number) {
		const allocation = this.allocations.findIndex(v => v ? v.ptr == ptr : false);
		if (allocation != -1) {
			this.bitmapeSetRange(this.allocations[allocation].ptr, this.allocations[allocation].size, false);
			this.allocations.splice(allocation, 1);
		} else {
			throw new Error("Invalid pointer!");
		}
	}

	arrayRead(ptr: number, offset: number) {
		// console.log(ptr, offset);
		return this.memory[ptr + offset];
	}

	arrayWrite(ptr: number, offset: number, val: number) {
		// console.log(ptr, offset, val);
		this.memory[ptr + offset] = val;
	}

	allocateString(input: string) {
		const tmp = this.strings.find(v => v.str == input);
		if (tmp) {
			return tmp.ptr;
		}

		const chars = input.split("");
		const ptr = this.allocate(chars.length + 1);

		for (let i = 0; i < chars.length; i++) {
			this.memory[ptr + i] = chars[i].charCodeAt(0);
		}

		this.memory[ptr + chars.length + 1] = 0;

		this.strings.push({
			ptr: ptr,
			str: input
		});

		return ptr;
	}
}

type NativeFunctionType = (f: Function, args: UnnamedVariable[]) => UnnamedVariable|undefined;
export class NativeFunction {
	name: string;
	f: NativeFunctionType;

	constructor (name: string, f: NativeFunctionType) {
		this.name = name;
		this.f = f;
	}
}

export class Interpreter {
    global: ParserNode;
	args: string[];
	memory: Memory;
	native: NativeFunction[];

	global_context: NamedVariable[];

    constructor (global: ParserNode, args: string[]) {
        this.global = global;
		this.args = args;
		this.memory = new Memory();
		this.native = [];
		this.global_context = [];
    }

	contextFind(name: string, context: NamedVariable[]) {
		const tmp = context.find((val) => val.datatype.name == name);
		if (tmp) {
			return tmp;
		} else {
			const tmp = this.global_context.find((val) => val.datatype.name == name);
			if (tmp) {
				return tmp;
			} else {
				throw new Error("Could not find " + name);
			}
		}
	}

	interpretExpression(expression: ParserNode, context: NamedVariable[]): any {
		// console.log(expression.id);
        switch (expression.id) {
            case ParserNodeType.NUMBER:
                return expression.value as number;
			case ParserNodeType.STRING:
				return this.memory.allocateString(expression.value as string);
			case ParserNodeType.ADD:
				return this.interpretExpression(expression.a as ParserNode, context) + this.interpretExpression(expression.b as ParserNode, context);
			case ParserNodeType.SUBSTRACT:
				return this.interpretExpression(expression.a as ParserNode, context) - this.interpretExpression(expression.b as ParserNode, context);
			case ParserNodeType.MULTIPLY:
				return this.interpretExpression(expression.a as ParserNode, context) * this.interpretExpression(expression.b as ParserNode, context);
			case ParserNodeType.DIVIDE:
				return Math.floor(this.interpretExpression(expression.a as ParserNode, context) / this.interpretExpression(expression.b as ParserNode, context));
			case ParserNodeType.MODULO:
				return this.interpretExpression(expression.a as ParserNode, context) % this.interpretExpression(expression.b as ParserNode, context);
			case ParserNodeType.OR:
				return this.interpretExpression(expression.a as ParserNode, context) | this.interpretExpression(expression.b as ParserNode, context);
			case ParserNodeType.AND:
				return this.interpretExpression(expression.a as ParserNode, context) & this.interpretExpression(expression.b as ParserNode, context);
			case ParserNodeType.XOR:
				return this.interpretExpression(expression.a as ParserNode, context) ^ this.interpretExpression(expression.b as ParserNode, context);
			case ParserNodeType.SHIFT_LEFT:
				return this.interpretExpression(expression.a as ParserNode, context) << this.interpretExpression(expression.b as ParserNode, context);
			case ParserNodeType.SHIFT_RIGHT:
				return this.interpretExpression(expression.a as ParserNode, context) >> this.interpretExpression(expression.b as ParserNode, context);
			case ParserNodeType.BIT_NOT:
				return ~this.interpretExpression(expression.a as ParserNode, context);
			case ParserNodeType.NOT:
				return (!this.interpretExpression(expression.a as ParserNode, context)) ? 1 : 0;

			case ParserNodeType.COMPARE:
				{
					const a = this.interpretExpression(expression.a as ParserNode, context);
					const b = this.interpretExpression(expression.b as ParserNode, context);
	
					switch(expression.value as Compare) {
						case "more":
							return a > b ? 1 : 0;
						case "more_equals":
							return a >= b ? 1 : 0;
						case "less":
							return a < b ? 1 : 0;
						case "less_equals":
							return a <= b ? 1 : 0;
						case "equals":
							return a == b ? 1 : 0;
						case "not_equals":
							return a != b ? 1 : 0;
						default:
							throw new Error("Unsupported " + expression.value);
					}
				}
			case ParserNodeType.VARIABLE_LOOKUP_ARRAY:
				{
					if (this.contextFind(expression.value as string, context).datatype.array) {
						const ptr = this.contextFind(expression.value as string, context);
						return this.memory.arrayRead(ptr.val as number, this.interpretExpression(expression.a as ParserNode, context));
					} else {
						return this.contextFind(expression.value as string, context).val & (1 << this.interpretExpression(expression.a as ParserNode, context));
					}
				}
			case ParserNodeType.VARIABLE_LOOKUP:
				return this.contextFind(expression.value as string, context).val;
			case ParserNodeType.FUNCTION_CALL:
                {
                    const call = expression.value as FunctionCall;
					const nf = (this.resolveFunction(call.name) as ParserNode).value as Function;
                    const args: UnnamedVariable[] = [];
                    for (let j = 0; j < call._arguments.length; j++) {
                        const res = this.interpretExpression(call._arguments[j], context);
                        args.push(new UnnamedVariable(new UnnamedDatatype(nf._arguments[j].datatype, nf._arguments[j].array), res));
                    }

                    const ret = this.callFunction(nf, args);
					// console.log(ret);
					return ret?.val;
                }
            default:
                throw new Error("Unsupported " + expression.id);
        }
    }

	executeCodeBlock(f: Function, block: ParserNode[], context: NamedVariable[]): UnnamedVariable | undefined {
        for (let i = 0; i < block.length; i++) {
			// console.log(block[i].id);
            switch (block[i].id) {
                case ParserNodeType.FUNCTION_CALL:
                    {
                        const call = block[i].value as FunctionCall;
						const nf = (this.resolveFunction(call.name) as ParserNode).value as Function;
                        const args: UnnamedVariable[] = [];
                        for (let j = 0; j < call._arguments.length; j++) {
                            const res = this.interpretExpression(call._arguments[j], context);
                            args.push(new UnnamedVariable(new UnnamedDatatype(nf._arguments[j].datatype, nf._arguments[j].array), res));
                        }
						// console.log(args);

                        this.callFunction(nf, args);
                    }
                    break;
				case ParserNodeType.VARIABLE_DECLARATION:
					if (context.find((val) => val.datatype.name == (block[i].value as NamedDatatype).name) != undefined) {
                        throw new Error("Already declared!");
                    } else {
						if (block[i].a) {
                        	context.push(new NamedVariable(block[i].value as NamedDatatype, this.interpretExpression(block[i].a as ParserNode, context)));
						} else {
                        	context.push(new NamedVariable(block[i].value as NamedDatatype, 0));
						}
                    }
                    break;
				case ParserNodeType.VARIABLE_ASSIGN:
					this.contextFind(block[i].value as string, context).val = this.interpretExpression(block[i].a as ParserNode, context);
					break;
				case ParserNodeType.VARIABLE_ASSIGN_ARRAY:
					if (this.contextFind(block[i].value as string, context).datatype.array) {
						this.memory.arrayWrite(this.contextFind(block[i].value as string, context).val, this.interpretExpression(block[i].a as ParserNode, context), this.interpretExpression(block[i].b as ParserNode, context));
					} else {
						throw new Error("Bit index assignment not supported!");
					}
					break;
				case ParserNodeType.CONDITIONAL_LOOP:
					while (this.interpretExpression(block[i].a as ParserNode, context)) {
						const res = this.executeCodeBlock(f, block[i].value as ParserNode[], context);
						if (res) {
							return res;
						}
					}
					break;
				case ParserNodeType.POST_CONDITIONAL_LOOP:
					do {
						const res = this.executeCodeBlock(f, block[i].value as ParserNode[], context);
						if (res) {
							return res;
						}
					} while (this.interpretExpression(block[i].a as ParserNode, context));
					break;
				case ParserNodeType.LOOP:
					{
						while (true) {
							const res = this.executeCodeBlock(f, block[i].value as ParserNode[], context);
							if (res) {
								return res;
							}
						}
					}
				case ParserNodeType.VARIABLE_INCREASE:
					this.contextFind(block[i].value as string, context).val++;
					break;
				case ParserNodeType.VARIABLE_DECREASE:
					this.contextFind(block[i].value as string, context).val--;
					break;
				case ParserNodeType.IF:
					{
						const iff = block[i].value as If;
						if (this.interpretExpression(block[i].a as ParserNode, context) != 0) {
							const res = this.executeCodeBlock(f, iff.true_block, context);
							if (res) {
								return res;
							}
						} else {
							if (iff.false_block) {
								const res = this.executeCodeBlock(f, iff.false_block, context);
								if (res) {
									return res;
								}
							}
						}
					}
					break;
				case ParserNodeType.RETURN:
					{
						if (block[i].a) {
							const res = this.interpretExpression(block[i].a as ParserNode, context);
							return new UnnamedVariable(new UnnamedDatatype(f.return_datatype.datatype, f.return_datatype.array), res);
						} else {
							return new UnnamedVariable(new UnnamedDatatype("void", false), undefined);
						}
					}
                default:
                    // console.log(block[i]);
                    throw new Error("Unsupported " + block[i].id);
            }
        }

		return undefined;
    }

	callFunction(f: Function, args: UnnamedVariable[]): UnnamedVariable | undefined {
		for (let i = 0; i < f._arguments.length; i++) {
            if (!args[i].check(f._arguments[i])) {
                throw new Error("Datatype mismatch!");
            }
        }

		// console.log(f.name, args);
		
		if (f.attributes.includes("assembly")) {
			const native = this.native.find(v => v.name == f.name);
			if(native) {
				return native.f(f, args);
			} else {
				throw new Error("Native function " + f.name + " not found!");
			}
        }

		const context: NamedVariable[] = [];

        for (let i = 0; i < f._arguments.length; i++) {
            context.push(new NamedVariable(f._arguments[i], args[i].val));
        }

        const ret = this.executeCodeBlock(f, f.body, context);
		if (f.attributes.includes("noreturn")) {
			throw new Error("Reached unreachable code!");
		}
		return ret;
	}

	resolveFunction(name: string): ParserNode | undefined {
        for (const i of this.global.value as ParserNode[]) {
            if (i.id == ParserNodeType.FUNCTION && (i.value as Function).name == name) {
                return i;
            }
        }
    }

	populateGlobalContext() {
		for (const i of this.global.value as ParserNode[]) {
            if (i.id == ParserNodeType.VARIABLE_DECLARATION) {
				if (i.a) {
					if ((i.value as NamedDatatype).array) {
						throw new Error("Global array inizializers not supported!");
					}

						if (i.a.id == ParserNodeType.STRING) {
							this.global_context.push(new NamedVariable(i.value as NamedDatatype, this.memory.allocateString(i.a.value as string)));
						} else if (i.a.id == ParserNodeType.NUMBER) {
							this.global_context.push(new NamedVariable(i.value as NamedDatatype, i.a.value));
						} else {
							throw new Error("Only string and number are supported for globals!");
						}
				} else {
					this.global_context.push(new NamedVariable(i.value as NamedDatatype, undefined));
				}
            }
        }
	}

    execute() {
		this.populateGlobalContext();

		this.native.push(new NativeFunction("printc", (_f, args) => {
			Deno.stdout.writeSync(new Uint8Array([args[0].val]));
			return undefined;
		}));

		this.native.push(new NativeFunction("allocate", (_f, args) => {
			return new UnnamedVariable(new UnnamedDatatype("int", false), this.memory.allocate(args[0].val as number));
		}));

		this.native.push(new NativeFunction("deallocate", (_f, args) => {
			this.memory.deallocate(args[0].val);
			return undefined;
		}));

		const args: UnnamedVariable[] = [];
		for (let i = 0; i < this.args.length; i++) {
			args.push(new UnnamedVariable(new UnnamedDatatype("str", false), this.memory.allocateString(this.args[i])));
		}

		const argc = new UnnamedVariable(new UnnamedDatatype("int", false), args.length);
		const argv = new UnnamedVariable(new UnnamedDatatype("str", true), this.memory.allocate(args.length));

		for (let i = 0; i < this.args.length; i++) {
			this.memory.arrayWrite(argv.val, i, args[i].val);
		}

		if (this.callFunction((this.resolveFunction("spark") as ParserNode).value as Function, [ argc, argv ])?.val) {
			throw new Error("Non zero return code!");
		}

		// for (let i = 0; i < this.memory.memory.length; i++) {
		// 	if (this.memory.memory[i]) {
		// 		// console.log(String.fromCharCode(this.memory.memory[i]));
		// 	}
		// }

		// console.log(this.memory);
    }
}