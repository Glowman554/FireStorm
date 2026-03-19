package commands

import (
	"encoding/json"
	"errors"
	"fire/arguments"
	"fire/firestorm"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"runtime/debug"
	"strings"
)

type Validate struct{}

type Target interface {
	Compile(input string, includes []string) string
	Run(file string, arguments []string) (*string, error)
}

type LLVMTarget struct{}

func (LLVMTarget) Compile(input string, includes []string) string {
	extension := firestorm.DetectExtension()
	target := firestorm.DetectTarget()

	output := input + "." + extension
	firestorm.Compile(input, output, target, includes)

	return output
}

func (LLVMTarget) Run(file string, arguments []string) (*string, error) {
	return run("./"+file, arguments)
}

type BytecodeTarget struct{}

func (BytecodeTarget) Compile(input string, includes []string) string {
	output := input + ".flbb"
	firestorm.Compile(input, output, "bytecode", includes)

	return output
}

func (BytecodeTarget) Run(file string, arguments []string) (*string, error) {
	return run("flvm", append([]string{file}, arguments...))
}

type BytecodeFlcTarget struct{}

func (BytecodeFlcTarget) Compile(input string, includes []string) string {
	output := input + ".flbb"
	args := []string{"--output=" + output, "--input=" + input}
	for _, include := range includes {
		args = append(args, "--include="+include)
	}
	run("flc", args)

	return output
}

func (BytecodeFlcTarget) Run(file string, arguments []string) (*string, error) {
	return run("flvm", append([]string{file}, arguments...))
}

type Expected struct {
	Arguments  []string `json:"arguments"`
	Output     []string `json:"output"`
	ShouldFail bool     `json:"should_fail"`
}

func (Validate) PopulateParser(parser *arguments.Parser) {
	parser.Allow("target", "The target to run the tests against (llvm, bytecode, bytecode_flc)")
}

func run(command string, arguments []string) (*string, error) {
	slog.Debug("[CMD] " + command + " " + strings.Join(arguments, " "))

	cmd := exec.Command(command, arguments...)
	var out strings.Builder
	cmd.Stdout = &out
	cmd.Stderr = &out

	err := cmd.Start()
	if err != nil {
		return nil, err
	}

	err = cmd.Wait()
	if err != nil {
		return nil, err
	}

	stdio := out.String()
	return &stdio, nil
}

func (Validate) Execute(parser *arguments.Parser) error {
	passed := 0
	notPassed := 0
	var target Target

	defaultTarget := "llvm"
	targetStr, err := parser.Consume("target", &defaultTarget)
	if err != nil {
		return err
	}

	switch *targetStr {
	case "llvm":
		target = LLVMTarget{}
	case "bytecode":
		target = BytecodeTarget{}
	case "bytecode_flc":
		target = BytecodeFlcTarget{}
	default:
		return errors.New("unknown target: " + *targetStr)
	}

	err = filepath.Walk(".", func(path string, info os.FileInfo, err error) error {
		if err == nil {
			path = strings.ReplaceAll(path, "\\", "/")
			if !strings.HasSuffix(path, ".fl") {
				return nil
			}

			slog.Info("Running validation", "path", path)

			data, err := os.ReadFile(path + ".expect")
			if err != nil {
				slog.Error(err.Error(), "path", path)
				return nil
			}

			var expected Expected
			err = json.Unmarshal(data, &expected)
			if err != nil {
				slog.Error(err.Error(), "path", path)
				return nil
			}

			defer func() {
				if r := recover(); r != nil {
					slog.Error("TEST NOT PASSED", "path", path, "error", r)
					println(string(debug.Stack()))
					notPassed++
				}
			}()
			outputFile := target.Compile(path, []string{"../libraries/stdlib/"})

			output, err := target.Run(outputFile, expected.Arguments)
			if err != nil {
				if expected.ShouldFail {
					slog.Debug("TEST PASSED", "path", path)
					passed++
				} else {
					slog.Error("TEST NOT PASSED", "path", path, "error", err)
					notPassed++
				}
				return nil
			} else if expected.ShouldFail {
				slog.Error("TEST NOT PASSED", "path", path, "error", "expected to fail but passed")
				notPassed++
				return nil
			}

			split := strings.Split(*output, "\n")
			for i := range expected.Output {
				line := expected.Output[i]
				actual := strings.ReplaceAll(split[i], "\r", "")
				if line == "*" {
					continue
				}
				if len(split) < i {
					slog.Error("TEST NOT PASSED", "path", path, "error", "not enough output")
					notPassed++
					return nil
				}
				if line != actual {
					slog.Error("TEST NOT PASSED", "path", path, "error", "output does not match expected", "line", line, "output", actual)
					notPassed++
					return nil
				}
			}
			slog.Debug("TEST PASSED", "path", path)
			passed++
		}
		return nil
	})
	slog.Info("Validation done", "passed", passed, "notPassed", notPassed)
	if notPassed > 0 {
		return errors.New("not all tests passed")
	}
	return err
}

func (Validate) Description() string {
	return "Run the tests"
}
