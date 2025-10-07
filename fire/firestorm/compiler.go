package firestorm

import (
	"fire/firestorm/target/bytecode"
	"fire/firestorm/target/llvm"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"strings"
)

func isOptionActive(option string) bool {
	if env, ok := os.LookupEnv(option); ok && (env == "1" || env == "true") {
		return true
	}
	return false
}

func Compile(input string, output string, target string, includes []string) {

	code, err := os.ReadFile(input)
	if err != nil {
		panic(err)
	}

	preprocessor := NewPreprocessor(includes)
	processedCode := preprocessor.Process(string(code))
	if isOptionActive("DEBUG_PROCESSED_CODE") {
		err = os.WriteFile(output+".processed", []byte(processedCode), fs.ModePerm)
		if err != nil {
			panic(err)
		}
	}

	lexer := NewLexer(processedCode)
	tokens := lexer.Tokenize()

	parser := NewParser(tokens, processedCode)
	global := parser.Global()

	switch target {
	case "bytecode":
		bc := bytecode.NewBYTECODE(global, processedCode)
		result := bc.Compile()

		tmp := strings.Split(output, ".")
		ending := tmp[len(tmp)-1]

		switch ending {
		case "flb":
			err = os.WriteFile(output, []byte(result), fs.ModePerm)
			if err != nil {
				panic(err)
			}
		case "flenc":
			encoder := bytecode.NewBYTECODEEncoder(preprocessor.NativeFunctions)
			encoded := encoder.Encode(result)
			err = os.WriteFile(output, []byte(encoded), fs.ModePerm)
			if err != nil {
				panic(err)
			}
		case "flbb":
			encoder := bytecode.NewBYTECODEEncoder(preprocessor.NativeFunctions)
			encoded := encoder.Encode(result)

			linked := bytecode.Link(encoded)
			err = os.WriteFile(output, linked, fs.ModePerm)
			if err != nil {
				panic(err)
			}
		default:
			panic("Unsupported output format " + ending)
		}

	default:
		bc := llvm.NewLLVM(global, target, processedCode)
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
		default:
			panic("Unsupported output format " + ending)
		}
	}

}

func runCommand(command string) {
	tmp := strings.Split(command, " ")

	cmd := exec.Command(tmp[0], tmp[1:]...)

	err := cmd.Start()
	if err != nil {
		panic(err)
	}

	err = cmd.Wait()
	if err != nil {
		fmt.Println("[CMD]", command)
		panic(err)
	}
}
