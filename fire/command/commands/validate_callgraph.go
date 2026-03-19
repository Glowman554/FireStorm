package commands

import (
	"fire/arguments"
	"fire/firestorm"
	"log/slog"
	"os"
	"path/filepath"
	"runtime/debug"
	"strings"
)

type ValidateCallgraph struct{}

func (ValidateCallgraph) PopulateParser(parser *arguments.Parser) {
}

func (ValidateCallgraph) Execute(parser *arguments.Parser) error {
	extension := "png"
	target := "callgraph"

	err := filepath.Walk(".", func(path string, info os.FileInfo, err error) error {
		if err == nil {
			path = strings.ReplaceAll(path, "\\", "/")
			if !strings.HasSuffix(path, ".fl") {
				return nil
			}

			slog.Info("Creating callgraph", "path", path)

			defer func() {
				if r := recover(); r != nil {
					slog.Error("CALLGRAPH CREATION FAILED", "path", path, "error", r)
					println(string(debug.Stack()))
				}
			}()
			firestorm.Compile(path, path+"."+extension, target, []string{"../libraries/stdlib/"})

		}
		return nil
	})

	slog.Info("Callgraph creation done")
	return err
}

func (ValidateCallgraph) Description() string {
	return "Creates callgraph DOT files for all tests"
}
