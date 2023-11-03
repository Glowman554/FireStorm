import { BaseCommand } from "../command.ts";
import { downloadTo } from "../package.ts";

export class GetCommand extends BaseCommand {
    constructor (args: string[]) {
        super(args, [
            "--package"
        ]);
    }

    async execute() {
        const _package = this.parser?.consumeOption("--package") as string;
        await downloadTo(_package, _package);

        console.log("Done.");
    }
}