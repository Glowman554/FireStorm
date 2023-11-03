import { ArgParser } from "./parser.ts";

export class BaseCommand {
    parser: ArgParser | null;

	constructor(args: string[], allowedArgs: string[] | undefined) {
		if (allowedArgs) {
			this.parser = new ArgParser(args, allowedArgs);
			this.parser.parse();
		} else {
			this.parser = null;
		}
	}

	execute(): Promise<void> {
		throw new Error("execute() not implemented");
	}
}