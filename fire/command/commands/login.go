package commands

import (
	"context"
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

	c, err := client.Get()
	if err != nil {
		return err
	}

	fmt.Println("Logging in using username " + *username + "...")

	token, err := c.Authentication.LoginUser(context.Background(), client.AuthenticationAuthenticationParams{Username: *username, Password: *password})
	if err != nil {
		return err
	}

	err = storage.StoreToken(token.Token)
	return err
}
