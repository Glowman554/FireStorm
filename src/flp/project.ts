export interface CompilerOptions {
	target: string;
	mode: string;
	other: string[] | undefined;
};

export interface ProjectFile {
    name: string;
    version: string;

    main: string;

	type: "executable" | "module";

    compiler: CompilerOptions | CompilerOptions[];

	dependencies: string[] | undefined;
}

export async function runCommand(command: string) {
	console.log("cmd: " + command);
	const proc = Deno.run({
		cmd: ["bash", "-c", command],
		stderr: "inherit",
		stdout: "inherit"
	});

	const status = await proc.status();
	proc.close();
	if (!status.success) {
		throw new Error("Could not execute: " + command);
	}
}

export function loadProject(module: string | undefined = undefined): ProjectFile {
	if (module) {
    	return JSON.parse(Deno.readTextFileSync("modules/" + module + "/project.json")) as ProjectFile;
	} else {
		return JSON.parse(Deno.readTextFileSync("project.json")) as ProjectFile;
	}
}