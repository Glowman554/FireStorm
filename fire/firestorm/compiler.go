package firestorm

import (
	"fire/firestorm/parser/node"
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

func prepareCompilation(output string, code []byte, includes []string) (*node.Node, string, Preprocessor) {
	preprocessor := NewPreprocessor(includes)
	processedCode := preprocessor.Process(string(code))
	if isOptionActive("DEBUG_PROCESSED_CODE") {
		err := os.WriteFile(output+".processed", []byte(processedCode), fs.ModePerm)
		if err != nil {
			panic(err)
		}
	}

	lexer := NewLexer(processedCode)
	tokens := lexer.Tokenize()

	parser := NewParser(tokens, processedCode)
	global := parser.Global()

	return global, processedCode, preprocessor
}

func Compile(input string, output string, target string, includes []string) {

	code, err := os.ReadFile(input)
	if err != nil {
		panic(err)
	}

	switch target {
	case "bytecode":
		global, processedCode, preprocessor := prepareCompilation(output, code, includes)

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

	case "bytecode_flc":
		tmp := strings.Split(output, ".")
		ending := tmp[len(tmp)-1]

		preprocessor := NewPreprocessor(includes)
		preprocessor.Process(string(code))

		for i := range preprocessor.usedPackages {
			includes = append(includes, fmt.Sprintf(".fire/%s@%s", preprocessor.usedPackages[i].Package, preprocessor.usedPackages[i].Version))
		}

		includeCommand := ""
		for i := range includes {
			includeCommand += fmt.Sprintf(" --include=%s", includes[i])
		}

		switch ending {
		case "flb":
			fallthrough
		case "flbb":
			runCommand(fmt.Sprintf("flc --input=%s --output=%s%s", input, output, includeCommand))
		default:
			panic("Unsupported output format " + ending)
		}

	case "callgraph":
		tmp := strings.Split(output, ".")
		ending := tmp[len(tmp)-1]

		global, processedCode, _ := prepareCompilation(output, code, includes)

		analyzer := NewAnalyzer(global, processedCode)
		analyzer.Analyze()

		callGraph := analyzer.BuildGraphvizCallgraph("spark")

		switch ending {
		case "dot":
			err = os.WriteFile(output, []byte(callGraph), fs.ModePerm)
			if err != nil {
				panic(err)
			}
		case "png":
			err = os.WriteFile(output+".dot", []byte(callGraph), fs.ModePerm)
			if err != nil {
				panic(err)
			}
			runCommand(fmt.Sprintf("dot -Tpng %s.dot -o %s", output, output))
		default:
			panic("Unsupported output format " + ending)
		}
	default:
		global, processedCode, _ := prepareCompilation(output, code, includes)

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
	// fmt.Println(command)
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
