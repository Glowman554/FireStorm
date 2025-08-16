package commands

import (
	"fire/arguments"
	"fire/firepack"
	"fire/firepack/authentication"
	"fmt"
)

type Register struct{}

func (Register) PopulateParser(parser *arguments.Parser) {
	parser.Allow("username", "FirePack username")
	parser.Allow("password", "FirePack password")
}

func (Register) Execute(parser *arguments.Parser) error {
	username, err := parser.Consume("username", nil)
	if err != nil {
		return err
	}

	password, err := parser.Consume("password", nil)
	if err != nil {
		return err
	}

	result, err := authentication.Register(*username, *password)
	if err != nil {
		return err
	}

	config := firepack.Config{Token: result.Token}
	err = firepack.SaveConfig(&config)
	if err != nil {
		return err
	}

	fmt.Println("Registered successfully")

	return nil
}

func (Register) Description() string {
	return "[FirePack] Register on firepack"
}
