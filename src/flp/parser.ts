export class ArgParserNode {
    name: string;
    value: string | undefined;
	constructor(name: string, value: string | undefined = undefined) {
		this.name = name;
		this.value = value;
	}
}

export class ArgParser {
    args: string[];
    allowedArgs: string[];
    nodes: ArgParserNode[];

	constructor(args: string[], allowedArgs: string[]) {
		this.args = args;
		this.allowedArgs = allowedArgs;
		
		if (this.allowedArgs.indexOf("--help") == -1) {
			this.allowedArgs.push("--help");
		}

		this.nodes = [];
	}

	parse() {
		for (const arg of this.args) {
			if (arg.startsWith("-")) {
				if (arg.indexOf("=") != -1) {
					const split = arg.split("=");
					if (this.allowedArgs.indexOf(split[0]) != -1) {
						this.nodes.push(new ArgParserNode(split[0], split[1]));
					} else {
						throw new Error("Invalid argument: " + arg);
					}
				} else {
					if (this.allowedArgs.indexOf(arg) != -1) {
						this.nodes.push(new ArgParserNode(arg));
					} else {
						throw new Error("Invalid argument: " + arg);
					}
				}
			} else {
				//throw new Error("Invalid argument: " + arg);
			}
		}

		if (this.isOption("--help")) {
			let str = "Possible arguments:\n";
			
			for (const arg of this.allowedArgs) {
				str += "> " + arg + "\n";
			}

			console.log(str);
			
			Deno.exit(0);
		}
	}

	consumeOption(name: string, _default = undefined) {
		for (const node of this.nodes) {
			if (node.name == name) {
				this.nodes.splice(this.nodes.indexOf(node), 1);

				if (!node.value) {
					throw new Error("Missing value for argument: " + node.name);
				}
				
				return node.value;
			}
		}

		if (_default != undefined) {
			return _default;
		} else {
			throw new Error("Missing argument: " + name);
		}
	}

	isOption(name: string) {
		for (const node of this.nodes) {
			if (node.name == name) {
				return true;
			}
		}

		return false;
	}
}