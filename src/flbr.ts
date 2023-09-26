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

const code = Deno.readTextFileSync(Deno.args[0]).split("\n").map(l => l.trim());

const labels: {
    name: string;
    idx: number;
}[] = [];

for (let i = 0; i < code.length; i++) {
    if (code[i].endsWith(":")) {
        labels.push({
            name: code[i].substring(0, code[i].length - 1),
            idx: i
        });
    }
}


function locateLabel(name: string): number {
    const loc = labels.find(l => l.name == name)?.idx;
    if (loc != undefined) {
        return loc + 1;
    } else {
        throw new Error("Label " + name + " not found!");
    }
}

const stack: number[] = [];
const memory = new Memory();
const natives: {
    name: string,
    func: () => void
}[] = [
    {
        name: "printc",
        func: () => {
            Deno.stdout.writeSync(new Uint8Array([stack.pop() as number]));
            stack.push(0);
        }
    },
    {
        name: "do_exit",
        func: () => {
            Deno.exit(stack.pop() as number);
        }
    },
    {
        name: "allocate",
        func: () => {
            stack.push(memory.allocate(stack.pop() as number));
        }
    },
    {
        name: "deallocate",
        func: () => {
            memory.deallocate(stack.pop() as number);
            stack.push(0);
        }
    }
];

interface VariableSlot {
    name: string,
    value: number,
    array: boolean
};

const global: VariableSlot[] = [];


for (const is of code) {
    if (is.endsWith(":")) {
        continue;
    }
    const instruction = is.split(" ");
    // console.log(instruction);

    switch (instruction[0]) {
        case "global":
            if (instruction[2] == "str") {
                global.push({
                    name: instruction[1],
                    value: memory.allocateString(is.substring(is.indexOf("\"") + 1, is.lastIndexOf("\""))),
                    array: false
                });
            } else {
                global.push({
                    name: instruction[1],
                    value: parseInt(instruction[3]),
                    array: false
                });
            }
            break;
        case "global_reserve":
            global.push({
                name: instruction[1],
                value: 0,
                array: instruction[3] == "true"
            });
            break;
    
        default:
            break;
    }
}

function loadAB() {
    const b = stack.pop() as number;
    const a = stack.pop() as number;
    return { a, b };
}

function invoke(location: number) {
    let counter = location;
    let noreturn = false;

    const context: VariableSlot[] = [];

    const locateLocal = (name: string) => {
        const loc = context.find(l => l.name == name);
        if (loc != undefined) {
            return loc;
        } else {
            const loc = global.find(l => l.name == name);
            if (loc != undefined) {
                return loc;
            }
            throw new Error("Locale " + name + " not found!");
        }
    }

    while (true) {
        const instructionRaw = code[counter++];
        if (instructionRaw.endsWith(":")) {
            continue;
        }
        const instruction = instructionRaw.split(" ");

        switch (instruction[0]) {
            case "string":
                stack.push(memory.allocateString(instructionRaw.substring(8, instructionRaw.length - 1)));
                break;
            case "number":
                stack.push(parseInt(instruction[1]));
                break;

            case "invoke":
                invoke(locateLabel(instruction[1]));
                break;
            case "invoke_native":
                {
                    const native = natives.find(n => n.name == instruction[1]);
                    if (native) {
                        native.func();
                    } else {
                        throw new Error("Native " + instruction[1] + " not found!");
                    }
                }
                break;
            case "goto_false":
                if (stack.pop() == 0) {
                    counter = locateLabel(instruction[1]);
                }
                break;
            case "goto_true":
                if (stack.pop() != 0) {
                    counter = locateLabel(instruction[1]);
                }
                break;
            case "goto":
                counter = locateLabel(instruction[1]);
                break;
            case "return":
                if (noreturn) {
                    invoke(locateLabel("unreachable"));
                    break;
                }
                return;
            
            case "load_indexed":
                {
                    const l = locateLocal(instruction[1]);
                    if (l.array) {
                        stack.push(memory.arrayRead(l.value, stack.pop() as number));
                    } else {
                        stack.push((l.value & (1 << (stack.pop() as number))) ? 1 : 0);
                    }
                }
                break;
            case "load":
                stack.push(locateLocal(instruction[1]).value);
                break;
            case "assign":
                locateLocal(instruction[1]).value = stack.pop() as number;
                break;
            case "assign_indexed":
                {
                    const b = stack.pop() as number;
                    const a = stack.pop() as number;
                    memory.arrayWrite(locateLocal(instruction[1]).value, a, b);
                }
                break;
            case "delete":
                stack.pop();
                break;

            case "less":
                {
                    const { a, b } = loadAB();
                    stack.push(a < b ? 1 : 0);
                }
                break;
            case "less_equals":
                {
                    const { a, b } = loadAB();
                    stack.push(a <= b ? 1 : 0);
                }
                break;
            case "more":
                {
                    const { a, b } = loadAB();
                    stack.push(a > b ? 1 : 0);
                }
                break;
            case "more_equals":
                {
                    const { a, b } = loadAB();
                    stack.push(a >= b ? 1 : 0);
                }
                break;
            case "equals":
                {
                    const { a, b } = loadAB();
                    stack.push(a == b ? 1 : 0);
                }
                break;
            case "not_equals":
                {
                    const { a, b } = loadAB();
                    stack.push(a != b ? 1 : 0);
                }
                break;
            case "invert":
                {
                    stack.push((stack.pop() as number) ? 0 : 1);
                }
                break;
            

            case "add":
                {
                    const { a, b } = loadAB();
                    stack.push(a + b);
                }
                break;
            case "sub":
                {
                    const { a, b } = loadAB();
                    stack.push(a - b);
                }
                break;
            case "mod":
                {
                    const { a, b } = loadAB();
                    stack.push(Math.floor(a % b));
                }
                break;
            case "div":
                {
                    const { a, b } = loadAB();
                    stack.push(Math.floor(a / b));
                }
                break;
            case "mul":
                {
                    const { a, b } = loadAB();
                    stack.push(a * b);
                }
                break;

            case "shift_left":
                {
                    const { a, b } = loadAB();
                    stack.push(a << b);
                }
                break;
            case "shift_right":
                {
                    const { a, b } = loadAB();
                    stack.push(a >> b);
                }
                break;
            case "or":
                {
                    const { a, b } = loadAB();
                    stack.push(a | b);
                }
                break;
            case "and":
                {
                    const { a, b } = loadAB();
                    stack.push(a & b);
                }
                break;
            case "xor":
                {
                    const { a, b } = loadAB();
                    stack.push(a ^ b);
                }
                break;
            case "not":
                stack.push(~(stack.pop() as number));
                break;
            
            case "increase":
                locateLocal(instruction[1]).value++;
                break;
            case "decrease":
                locateLocal(instruction[1]).value--;
                break;

            case "noreturn":
                noreturn = true;
                break;
            
            case "variable":
                context.push({
                    name: instruction[1],
                    value: 0,
                    array: instruction[3] == "true"
                });
                break;

            default:
                throw new Error("illegal instruction " + instruction[0]);
        }


        // console.log(instructionRaw, stack, context, noreturns);
        // await new Promise((resolve, reject) => setTimeout(resolve, 10));
    }
}

const args: number[] = [];
for (let i = 0; i < Deno.args.length; i++) {
    args.push(memory.allocateString(Deno.args[i]));
}

const argc = args.length;
const argv = memory.allocate(args.length);

for (let i = 0; i < args.length; i++) {
    memory.arrayWrite(argv, i, args[i]);
}

stack.push(argc);
stack.push(argv);

invoke(locateLabel("spark"));
// console.log(memory.allocations); 