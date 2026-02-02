package commands

import (
	"encoding/json"
	"errors"
	"fire/arguments"
	"fire/firestorm/target/bytecode"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"runtime/debug"
	"strings"
)

type ValidateBytecodeExternal struct{}

func (ValidateBytecodeExternal) PopulateParser(parser *arguments.Parser) {
	parser.Allow("firec", "Path to firec binary (default: firec)")
}

func (ValidateBytecodeExternal) Execute(parser *arguments.Parser) error {
	passed := 0
	notPassed := 0
	binaryExtension := "flbb"

	defaultFirec := "firec"
	firecPath, err := parser.Consume("firec", &defaultFirec)
	if err != nil {
		return err
	}

	err = filepath.Walk(".", func(path string, info os.FileInfo, err error) error {
		if err == nil {
			path = strings.ReplaceAll(path, "\\", "/")
			if !strings.HasSuffix(path, ".fl") {
				return nil
			}

			// Skip tests with .no files
			if _, err := os.Stat(path + ".no"); err == nil {
				slog.Info("Skipping test (has .no file)", "path", path)
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

			// Compile using firec with encoding to binary format
			binaryOutput := path + "." + binaryExtension
			compileArgs := []string{
				"--input=" + path,
				"--output=" + binaryOutput,
				"--include=../libraries/stdlib/",
				"--encode",
			}
			
			// Capture output even on error
			cmd := exec.Command(*firecPath, compileArgs...)
			var out strings.Builder
			cmd.Stdout = &out
			cmd.Stderr = &out
			err = cmd.Run()
			
			if err != nil {
				output := out.String()
				if output != "" {
					slog.Error("Compilation failed", "path", path, "error", err, "output", output)
				} else {
					slog.Error("Compilation failed", "path", path, "error", err)
				}
				notPassed++
				return nil
			}

			// Run with flvm
			arguments := []string{binaryOutput}
			arguments = append(arguments, expected.Arguments...)

			output, err := run("flvm", arguments)
			if err != nil {
				if expected.ShouldFail {
					slog.Debug("TEST PASSED", "path", path)
					passed++
				} else {
					slog.Error("TEST NOT PASSED", "path", path, "error", err)
					notPassed++
				}
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

func (ValidateBytecodeExternal) Description() string {
	return "Run the tests using external firec compiler (C implementation)"
}
