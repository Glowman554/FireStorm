package commands

import (
	"fire/arguments"
	"fire/firestorm"
	"fire/project"
)

type Executable struct{}

func (Executable) PopulateParser(parser *arguments.Parser) {
}

func (Executable) Execute(parser *arguments.Parser) error {
	proj, err := project.Load()
	if err != nil {
		return err
	}

	proj.Compiler = &project.Compiler{
		Input:  "main.fl",
		Output: "main." + firestorm.DetectExtension(),
	}

	return project.Save(proj)
}

func (Executable) Description() string {
	return "Convert a project to be executable"
}
