export function findErrorLine(code: string, index: number) {
    const lines = code.split('\n');
    let totalChars = 0;

    for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length;
        totalChars += lineLength;

        if (totalChars >= index) {
            const lineIndex = i + 1;
            const charInLine = index - (totalChars - lineLength);
            return { line: lineIndex, char: charInLine };
        }

        totalChars++;
    }

    throw new Error("what");
}

interface File {
    base_offset: number;
    name: string | undefined;
}

export function findErrorLineFile(code: string, index: number) {
    const line = findErrorLine(code, index);
    const lines = code.split("\n");

    const fileStack: File[] = [
        {
            base_offset: 0,
            name: undefined
        }
    ];

    for (let i = 0; i < line.line; i++) {
        if (lines[i].startsWith("//@file")) {
            fileStack.push({
                base_offset: i + 1,
                name: lines[i].substring(8)
            });
        } else if (lines[i].startsWith("//@endfile")) {
            fileStack.pop();
        }

    }

    // console.log(fileStack);
    return {
        file: fileStack[fileStack.length - 1].name,
        line: line.line - fileStack[fileStack.length - 1].base_offset,
        char: line.char,
        lineStr: lines[line.line - 1]
    };
}