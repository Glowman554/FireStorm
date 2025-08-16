package commands

import (
	"bufio"
	"fire/arguments"
	"fire/firepack"
	"fire/firepack/projects"
	"fire/firepack/versions"
	"fmt"
	"os"
	"strings"
)

type Delete struct{}

func (Delete) PopulateParser(parser *arguments.Parser) {
	parser.Allow("name", "Project name to delete")
	parser.Allow("version", "Project version to delete")
}

func (d Delete) Execute(parser *arguments.Parser) error {
	config, err := firepack.LoadConfig()
	if err != nil {
		return err
	}

	name, err := parser.Consume("name", nil)
	if err != nil {
		return err
	}

	if parser.Has("version") {
		version, err := parser.Consume("version", nil)
		if err != nil {
			return err
		}

		if d.warning(*name, version) {
			_, err := versions.Delete(config.Token, *name, *version)
			if err != nil {
				return err
			}

			fmt.Println("Version deleted")
		}
	} else {
		if d.warning(*name, nil) {
			_, err := projects.Delete(config.Token, *name)
			if err != nil {
				return err
			}

			fmt.Println("Project deleted")
		}
	}

	return nil
}

func (Delete) Description() string {
	return "[FirePack] Delete a project or a version of a project"
}

func (Delete) warning(project string, version *string) bool {
	if version != nil {
		fmt.Printf("WARNING: This will delete the version %s of the project %s\n", *version, project)
	} else {
		fmt.Printf("WARNING: This will delete the project %s\n", project)
	}

	reader := bufio.NewReader(os.Stdin)
	fmt.Println("Do you want to continue? (yes/no) > ")
	response, _ := reader.ReadString('\n')
	response = strings.TrimSpace(response)

	if response != "yes" {
		fmt.Println("Aborted")
		return false
	}

	return true
}
