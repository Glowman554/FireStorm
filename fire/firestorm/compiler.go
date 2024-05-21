package firestorm

import (
	"fire/firestorm/target/llvm"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"strings"
)

func Compile(input string, output string, target string, includes []string) {

	code, err := os.ReadFile(input)
	if err != nil {
		panic(err)
	}

	preprocessor := NewPreprocessor(includes)
	processedCode := preprocessor.Process(string(code))

	lexer := NewLexer(processedCode)
	tokens := lexer.Tokenize()

	parser := NewParser(tokens, processedCode)
	global := parser.Global()

	bc := llvm.NewLLVM(global, target)
	result := bc.Compile()

	tmp := strings.Split(output, ".")
	ending := tmp[len(tmp)-1]

	switch ending {
	case "ll":
		err = os.WriteFile(output, []byte(result), fs.ModePerm)
		if err != nil {
			panic(err)
		}
	case "o":
		err = os.WriteFile(output+".ll", []byte(result), fs.ModePerm)
		if err != nil {
			panic(err)
		}
		runCommand(fmt.Sprintf("clang -c %s -o %s -target %s", output+".ll", output, target))
	case "elf":
		fallthrough
	case "exe":
		err = os.WriteFile(output+".ll", []byte(result), fs.ModePerm)
		if err != nil {
			panic(err)
		}
		runCommand(fmt.Sprintf("clang %s -o %s -target %s", output+".ll", output, target))
	}
}

func runCommand(command string) {
	// fmt.Println("[CMD]", command)
	tmp := strings.Split(command, " ")

	cmd := exec.Command(tmp[0], tmp[1:]...)

	err := cmd.Start()
	if err != nil {
		panic(err)
	}

	err = cmd.Wait()
	if err != nil {
		panic(err)
	}
}
