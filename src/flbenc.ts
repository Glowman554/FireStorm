interface FunctionInfo {
    name: string;
    body: string[];
}

const instructions: {[key: string]:number} = {
    "global": 0,
    "global_reserve": 1,

    "assign": 2,
    "assign_indexed": 3,
    "load": 4,
    "load_indexed": 5,


    "number": 6,
    "string": 7,

    "goto": 8,
    "goto_true": 9,
    "goto_false": 10,
    "invoke": 11,
    "invoke_native": 12,
    "return": 14,

    "variable": 15,

    "increase": 16,
    "decrease": 17,
    "add": 18,
    "sub": 19,
    "mul": 20,
    "div": 21,
    "mod": 22,

    "less": 23,
    "less_equals": 24,
    "more": 25,
    "more_equals": 26,
    "equals": 27,
    "not_equals": 28,

    "or": 29,


    "noreturn": 99,
    "delete": 100
};



const datatypes: {[key: string]:number} = {
    "int": 1,
    "chr": 2,
    "str": 3
};

function parseCode(lines: string[]): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    let currentFunction: FunctionInfo | null = null;

    for (const line of lines) {
        if (line.startsWith("@")) {
            const pis = line.split(" ");
            switch (pis[0]) {
                case "@begin":
                    currentFunction = { name: pis[2], body: [] };
                    break;
                case "@end":
                    functions.push(currentFunction as FunctionInfo);
                    currentFunction = null;
                    break;

            }
        } else if (currentFunction) {
            currentFunction.body.push(line);
        }
    }

    return functions;
}

const natives = ["printc", "allocate", "deallocate", "do_exit"];

function translateFunction(f: FunctionInfo) {
    let bin = "";
    let locales: string[] = [];
    for (const is of f.body) {
        if (is == "") {
            continue;
        }
        const instruction = is.split(" ");

        if (is.endsWith(":")) {
            bin += `_${is}\n`;
            continue;
        } 

        bin += `\tdb ${instructions[instruction[0]]} ; ${is}\n`;

        switch (instruction[0]) {
            case "variable":
                locales.push(instruction[1]);
                bin += `\t\tdb ${locales.indexOf(instruction[1])}, ${datatypes[instruction[2]]}, ${instruction[3] == "true" ? 1 : 0}\n`;
                break;

            case "load":
            case "load_indexed":
            case "assign":
            case "assign_indexed":
            case "increase":
            case "decrease":
                bin += `\t\tdb ${locales.indexOf(instruction[1])}\n`;
                break;
            
            case "number":
                bin += `\t\tdq ${instruction[1]}\n`;
                break;

            case "invoke":
            case "goto":
            case "goto_false":
            case "goto_true":
                bin += `\t\tdq _${instruction[1]}\n`;
                break;

            case "invoke_native":
                if (!natives.includes(instruction[1])) {
                    throw new Error("Native " + instruction[1] + " not found!");
                }
                bin += `\t\tdq ${natives.indexOf(instruction[1])}\n`;
                break;

            case "string":
                {
                    const s = is.substring(is.indexOf("\"") + 1, is.lastIndexOf("\""));
                    bin += `\t\tdq ${s.length}\n`;
                    bin += `\t\tdb "${s}", 0\n`;
                }
                break;
        
            default:
                if (!instructions[instruction[0]] || instruction.length != 1) {
                    console.log("Invalid instruction " + instruction[0]);
                }
        }

        // bin += `; ${is}\n`;
    }
    console.log(locales);

    return bin;
}

const code = Deno.readTextFileSync(Deno.args[0]).split("\n").map(l => l.trim());

let final = "[org 0]\ndq _spark\n";
const parsedFunctions = parseCode(code);
parsedFunctions.forEach((func) => {
    // console.log(`Function Name: ${func.name}`);
    // console.log(func);

    final += translateFunction(func);
    // console.log(`Body:`);
    // func.body.forEach((line) => console.log(`    ${line}`));
    // console.log('\n');
});

Deno.writeTextFileSync("test.asm", final);