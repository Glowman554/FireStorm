package commands

import (
	"fire/arguments"
	"fire/firestorm"
	"strings"
)

type Compile struct{}

func (Compile) PopulateParser(parser *arguments.Parser) {
	parser.Allow("input", "Input file")
	parser.Allow("outpu", "Output file")
	parser.Allow("target", "Compilation target")
	parser.Allow("include", "Add file to include path")
}

func (Compile) Execute(parser *arguments.Parser) error {
	input, err := parser.Consume("input", nil)
	if err != nil {
		return err
	}

	defaultOutput := "a." + firestorm.DetectExtension()
	output, err := parser.Consume("output", &defaultOutput)
	if err != nil {
		return err
	}

	defaultTarget := firestorm.DetectTarget()
	target, err := parser.Consume("target", &defaultTarget)
	if err != nil {
		return err
	}

	includes := []string{}
	for parser.Has("include") {
		include, err := parser.Consume("include", nil)
		if err != nil {
			return nil
		}
		if !strings.HasSuffix(*include, "/") {
			includes = append(includes, *include+"/")
		} else {
			includes = append(includes, *include)
		}
	}

	firestorm.Compile(*input, *output, *target, includes)

	return nil
}

func (Compile) Description() string {
	return "Compile a file withouth using the build system"
}
