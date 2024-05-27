package commands

import (
	"fire/arguments"
	"fire/project"
	"fmt"
)

type Init struct{}

func (Init) PopulateParser(parser *arguments.Parser) {
	parser.Allow("name", "Project name")
	parser.Allow("executable", "Set if project is executable")
}

func (Init) Execute(parser *arguments.Parser) error {
	name, err := parser.Consume("name", nil)
	if err != nil {
		return err
	}
	fmt.Println("Created project file.")

	return project.Save(project.NewProject(*name, parser.Has("executable")))
}

func (Init) Description() string {
	return "Init a new project"
}
