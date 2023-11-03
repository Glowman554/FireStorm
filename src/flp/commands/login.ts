import { BaseCommand } from "../command.ts";
import { apiCall, loadToken, saveToken, LoginResponse } from "../api.ts";

export class LoginCommand extends BaseCommand {
    constructor (args: string[]) {
        super(args, undefined);
    }

    doPrompt(question: string) {
        let answer: string | null = null;
        while (answer == null) {
            answer = prompt(question);
        }
        return answer;
    }

    async execute() {
        if (await loadToken()) {
            throw new Error("Already logged in!");
        }

        const name = this.doPrompt("Username? ");
        const password = this.doPrompt("Password? ");

        const res = await apiCall(`/user/login?name=${encodeURIComponent(name)}&password=${encodeURIComponent(password)}`) as LoginResponse;
        saveToken(res.token);
    }
}