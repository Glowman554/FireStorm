package commands

import (
	"fire/arguments"
	"fire/firepack"
	"fire/firepack/authentication"
	"fmt"
)

type Login struct{}

func (Login) PopulateParser(parser *arguments.Parser) {
	parser.Allow("username", "FirePack username")
	parser.Allow("password", "FirePack password")
}

func (Login) Execute(parser *arguments.Parser) error {
	username, err := parser.Consume("username", nil)
	if err != nil {
		return err
	}

	password, err := parser.Consume("password", nil)
	if err != nil {
		return err
	}

	result, err := authentication.Login(*username, *password)
	if err != nil {
		return err
	}

	config := firepack.Config{Token: result.Token}
	err = firepack.SaveConfig(&config)
	if err != nil {
		return err
	}

	fmt.Println("Logged in successfully")

	return nil
}

func (Login) Description() string {
	return "[FirePack] Login to firepack"
}
