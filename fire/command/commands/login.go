package commands

import (
	"fire/arguments"
	"fire/client"
	"fire/storage"
	"fmt"
)

type Login struct{}

func (Login) PopulateParser(parser *arguments.Parser) {
	parser.Allow("username")
	parser.Allow("password")
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

	fmt.Println("Logging in using username " + *username + "...")

	token, err := client.LoginUserAccount(*username, *password)
	if err != nil {
		return err
	}

	err = storage.StoreToken(*token)
	return err
}
