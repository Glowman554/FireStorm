package commands

import (
	"fire/arguments"
	"fire/firepack"
	"fire/firepack/authentication"
	"fmt"
)

type Status struct{}

func (Status) PopulateParser(parser *arguments.Parser) {
}

func (Status) Execute(parser *arguments.Parser) error {
	config, err := firepack.LoadConfig()
	if err != nil {
		return err
	}

	status, err := authentication.Status(config.Token)
	if err != nil {
		return err
	}

	fmt.Println("Login status: " + status.Username)

	return nil
}

func (Status) Description() string {
	return "[FirePack] Check login status"
}
