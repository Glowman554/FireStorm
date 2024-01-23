async function runCommand(command: string) {
	// console.log("cmd: " + command);
	const proc = Deno.run({
		cmd: command.split(" ").filter(v => v != ""),
		stderr: "inherit",
		stdout: "piped"
	});

	const status = await proc.status();
	const stdout = new TextDecoder().decode(await proc.output());
	proc.close();
	if (!status.success) {
		throw new Error("Could not execute: " + command);
	}

	return stdout;
}
function genCode(structDefinition: string, structName: string, members: string[]) {
    let code = "";

    code += "#include <stdbool.h>\n";
    code += "#include <stdint.h>\n";
    code += "#include <stdio.h>\n";

    code += structDefinition + "\n";

    code += "int main() {\n";
    for (const member of members) {
        const name = structName.startsWith("struct ") ? structName.replace("struct ", "") : structName;
        code += `\tprintf("$define ${name}_offset_${member} %ld\\n", __builtin_offsetof(${structName}, ${member}));\n`;
    }

    code += `\tprintf("$define ${structName}_size %ld\\n", sizeof(${structName}));\n`;

    code += "}\n";

    return code;
}

export async function structGen(structDefinition: string, structName: string, members: string[], gcc = "gcc") {
    Deno.writeTextFileSync("/tmp/struct.c", genCode(structDefinition, structName, members));
    await runCommand(gcc + " /tmp/struct.c -o /tmp/struct.elf");
    return await runCommand("/tmp/struct.elf");
}