package commands

import (
	"context"
	"fire/arguments"
	"fire/client"
	"fire/storage"
	"fmt"
)

type Create struct{}

func (Create) PopulateParser(parser *arguments.Parser) {
	parser.Allow("username")
	parser.Allow("password")
}

func (Create) Execute(parser *arguments.Parser) error {
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

	fmt.Println("Creating account " + *username + "...")

	token, err := c.Authentication.CreateUser(context.Background(), client.AuthenticationAuthenticationParams{Username: *username, Password: *password})
	if err != nil {
		return err
	}

	err = storage.StoreToken(token.Token)
	return err
}
