import { apiCall, loadToken } from "../api.ts";
import { BaseCommand } from "../command.ts";
import { loadProject, ProjectFile } from "../project.ts";
import getFiles from "https://deno.land/x/getfiles@v1.0.0/mod.ts";

export class DeployCommand extends BaseCommand {
    constructor (args: string[]) {
        super(args, ["--remote-init"]);
    }

    async upload(file: string, token: string, project: ProjectFile) {
        console.log(`Uploading ${file}...`);
        await apiCall(`/remote/upload?token=${encodeURIComponent(token)}&name=${encodeURIComponent(project.name)}&version=${encodeURIComponent(project.version)}&file=${encodeURIComponent(file)}`, Deno.readTextFileSync(file));
    }

    async execute() {
        const project = loadProject();
        console.log(`Deploying ${project.name}@${project.version}`);

        const token = await loadToken();
        if (token == undefined) {
            throw new Error("Not logged in!");
        }

        if (this.parser?.isOption("--remote-init")) {
            console.log(`Creating remote ${project.name}...`);
            await apiCall(`/remote/init?token=${encodeURIComponent(token)}&name=${encodeURIComponent(project.name)}&type=${project.type}`);
        }

        await apiCall(`/remote/deployment?token=${encodeURIComponent(token)}&name=${encodeURIComponent(project.name)}&version=${encodeURIComponent(project.version)}`);

        for (const f of getFiles(".").filter(f => f.ext == "fl").filter(f => !f.path.startsWith("modules"))) {
            await this.upload(f.path, token, project);
        }
        await this.upload("project.json", token, project);

        console.log("Done.");
    }
}