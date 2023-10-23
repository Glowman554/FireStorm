interface Define {
	name: string;
	value: string;
}

export class Preprocessor {
	include_paths: string[];
	included_files: string[];
	constructor (include_paths: string[]) {
		this.include_paths = include_paths;
		this.included_files = [];
	}

	try_read(file: string): string | undefined {
		// console.log(`try_read(${file})`);
		try {
			return Deno.readTextFileSync(file);
		} catch (_) {
			return undefined;
		}
	}


	preprocessIncludes(code: string): string {
		const matches = code.match(/\$include ?<[\w/\.]*.\w*>/g);
		if (matches) {
			for (let i = 0; i < matches.length; i++) {
				code = code.replace(matches[i], "");
				const inc = matches[i].split("<")[1].split(">")[0];

				let ncode = this.try_read(inc);

				for (const i of this.include_paths) {
					if (ncode) {
						break;
					}

					ncode = this.try_read(i + inc);
				}

				if (ncode == undefined) {
					throw new Error("Could not include " + inc);
				}

				if (!this.included_files.includes(inc)) {
					this.included_files.push(inc);
					code += "\n//@file " + inc;
					code += "\n" + this.preprocessIncludes(ncode);
					code += "\n//@endfile";
				}
			}
		}
		return code;
	}

	preprocessDefines(code: string): string {
		const matches = code.match(/\$define ([^ ]*) (.*)/g);

		const defines: Define[] = [];

		if (matches) {
			for (let i = 0; i < matches.length; i++) {
				code = code.replace(matches[i], "");

				const defineSplit = matches[i].split(" ");
				defineSplit.shift();

				const defineName = defineSplit.shift() as string;
				const defineValue = defineSplit.join(" ");

				defines.push({
					name: defineName,
					value: defineValue
				});
			}
		}

		for (const define of defines) {
			code = code.replaceAll(define.name, define.value);
		}

		return code;
	}


	preprocess(code: string): string {
		code = this.preprocessIncludes(code);
		code = this.preprocessDefines(code);
		return code;
	}
}