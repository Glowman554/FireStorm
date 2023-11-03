import { BaseCommand } from "../command.ts";
import { apiCall, loadToken, saveToken } from "../api.ts";

export class LogoutCommand extends BaseCommand {
    constructor (args: string[]) {
        super(args, undefined);
    }

    async execute() {
        const token = await loadToken();
        if (token == undefined) {
            throw new Error("Not logged in!");
        }

        await apiCall(`/user/logout?token=${encodeURIComponent(token)}`);
        saveToken(undefined);
    }
}