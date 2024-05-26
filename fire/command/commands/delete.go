package commands

import (
	"context"
	"fire/arguments"
	"fire/client"
	"fire/storage"
	"fmt"
)

type Delete struct{}

func (Delete) PopulateParser(parser *arguments.Parser) {
	parser.Allow("account")
	parser.Allow("package")
	parser.Allow("version")
}

func (Delete) Execute(parser *arguments.Parser) error {
	c, err := client.Get(storage.TokenOption())
	if err != nil {
		return err
	}

	if parser.Has("account") {
		fmt.Println("deleting account...")
		err := c.Authentication.DeleteUser(context.Background())
		if err != nil {
			return err
		}
	}

	if parser.Has("package") {
		pkg, err := parser.Consume("package", nil)
		if err != nil {
			return err
		}

		if parser.Has("version") {
			version, err := parser.Consume("version", nil)
			if err != nil {
				return err
			}
			fmt.Println("deleting version...")
			err = c.Remote.DeletePackageVersion(context.Background(), *pkg, client.RemoteDeletePackageVersionProps{Version: *version})
			if err != nil {
				return err
			}
		} else {
			fmt.Println("deleting package...")
			err = c.Remote.DeletePackage(context.Background(), *pkg)
			if err != nil {
				return err
			}
		}
	}

	return nil
}
