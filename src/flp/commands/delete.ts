import { BaseCommand } from "../command.ts";
import { apiCall, loadToken } from "../api.ts";

export class DeleteCommand extends BaseCommand {
    constructor (args: string[]) {
        super(args, [
            "--account",
            "--package",
            "--version"
        ]);
    }

    doPrompt(question: string) {
        let answer: string | null = null;
        while (answer == null) {
            answer = prompt(question);
        }
        return answer;
    }

    async execute() {
        const token = await loadToken();
        if (token == undefined) {
            throw new Error("Not logged in!");
        }

        if (this.parser?.isOption("--account")) {
            console.log("WARNING: This action will delete all packages deployed by you!");
            console.log("WARNING: This can not be undone!");

            if (this.doPrompt("Do you want to continue (yes/no)?") == "yes") {
                await apiCall(`/user/delete?token=${token}`);
            }
        } else if (this.parser?.isOption("--package")) {
            console.log("WARNING: This can not be undone!");

            if (this.doPrompt("Do you want to continue (yes/no)?") == "yes") {
                await apiCall(`/remote/init/delete?token=${token}&name=${this.parser.consumeOption("--package")}`);
            }
        } else if (this.parser?.isOption("--version")) {
            console.log("WARNING: This can not be undone!");

            if (this.doPrompt("Do you want to continue (yes/no)?") == "yes") {
                const [ name, version ] = this.parser.consumeOption("--version").split("@");
                await apiCall(`/remote/deployment/delete?token=${token}&name=${name}&version=${version}`);
            }
        } else {
            throw new Error("Please add option to delete something!");
        }

        console.log("Done.");
    }
}