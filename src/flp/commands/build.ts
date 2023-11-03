import { BaseCommand } from "../command.ts";
import { loadProject, runCommand } from "../project.ts";
import { downloadIfNecessary, readIncludes } from "../package.ts";

export class BuildCommand extends BaseCommand {
    constructor (args: string[]) {
        super(args, undefined);
    }



    async execute() {
        const project = loadProject();

        if (project.type != "executable") {
            throw new Error("Can not build non executable project!");
        }

        console.log(`Building ${project.name}@${project.version}`);

        let command = "flc ";
        command += "-t " + project.compiler.target + " ";
        command += "-o " + project.main + "." + project.compiler.mode + " ";
        for (const i of project.dependencies || []) {
            await downloadIfNecessary(i);
            // command += "-i modules/" + i + "/ ";
        }
        for (const i of readIncludes()) {
            command += "-i \"modules/" + i + "/\" ";
        }
        for (const i of project.compiler.other || []) {
            command += i + " ";
        }
        command += project.main;

        await runCommand(command);

        console.log("Done.");
    }
}