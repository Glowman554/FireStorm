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
	"strings"
)

type Validate struct{}

type Expected struct {
	Arguments  []string `json:"arguments"`
	Output     []string `json:"output"`
	ShouldFail bool     `json:"should_fail"`
}

func (Validate) PopulateParser(parser *arguments.Parser) {
}

func run(command string, arguments []string) (*string, error) {
	// fmt.Println("[CMD]", command)

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
	extension := firestorm.DetectExtension()
	target := firestorm.DetectTarget()

	err := filepath.Walk(".", func(path string, info os.FileInfo, err error) error {
		if err == nil {
			path = strings.ReplaceAll(path, "\\", "/")
			if !strings.HasSuffix(path, ".fl") {
				return nil
			}

			slog.Debug("Running validation", "path", path)

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
					notPassed++
				}
			}()
			firestorm.Compile(path, path+"."+extension, target, []string{"../libraries/stdlib/"})

			output, err := run("./"+path+"."+extension, expected.Arguments)
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
