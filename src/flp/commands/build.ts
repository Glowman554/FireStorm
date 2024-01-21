import { BaseCommand } from "../command.ts";
import { loadProject, runCommand, CompilerOptions } from "../project.ts";
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

        let options: CompilerOptions[] = [];
        if (Array.isArray(project.compiler)) {
            options = project.compiler;
        } else {
            options.push(project.compiler);
        }

        console.log("Building for " + options.length + " targets");

        for (const option of options) {
            let command = "flc ";
            command += "-t " + option.target + " ";
            command += "-o " + project.main + "." + option.target + "." + option.mode + " ";
            for (const i of project.dependencies || []) {
                await downloadIfNecessary(i);
                // command += "-i modules/" + i + "/ ";
            }
            for (const i of readIncludes()) {
                command += "-i \"modules/" + i + "/\" ";
            }
            for (const i of option.other || []) {
                command += i + " ";
            }
            command += project.main;

            await runCommand(command);
        }

        console.log("Done.");
    }
}