package commands

import (
	"errors"
	"fire/arguments"
	"fire/firestorm"
	"fire/project"
	"fmt"
)

type Build struct{}

func (Build) PopulateParser(parser *arguments.Parser) {
}

func (Build) Execute(parser *arguments.Parser) error {
	proj, err := project.Load()
	if err != nil {
		return err
	}

	if proj.Compiler == nil {
		return errors.New("missing field 'compiler' in project file")
	}

	fmt.Println("Building " + proj.Name + "@" + proj.Version)

	firestorm.Compile(proj.Compiler.Input, proj.Compiler.Output, proj.Compiler.Target, proj.Compiler.Includes)

	return nil
}
