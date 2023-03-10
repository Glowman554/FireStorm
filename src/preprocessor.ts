export class Preprocessor {
	include_paths: string[];
	included_files: string[];
	constructor (include_paths: string[]) {
		this.include_paths = include_paths;
		this.included_files = [];
	}

	try_read(file: string): string | undefined {
		console.log(`try_read(${file})`);
		try {
			return Deno.readTextFileSync(file);
		} catch (_) {
			return undefined;
		}
	}

	preprocess(code: string): string {
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
					code += "\n" + this.preprocess(ncode);
				}
			}
		}
		return code;
	}
}