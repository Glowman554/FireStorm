package commands

import (
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
	token, err := storage.LoadToken()
	if err != nil {
		return err
	}

	if parser.Has("account") {
		fmt.Println("deleting account...")
		err := client.DeleteUserAccount(*token)
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
			err = client.DeletePackageVersion(*token, *pkg, *version)
			if err != nil {
				return err
			}
		} else {
			fmt.Println("deleting package...")
			err = client.DeletePackage(*token, *pkg)
			if err != nil {
				return err
			}
		}
	}

	return nil
}
