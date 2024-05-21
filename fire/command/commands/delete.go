package commands

import (
	"fire/arguments"
	"fire/client"
	"fire/storage"
)

type Delete struct{}

func (Delete) PopulateParser(parser *arguments.Parser) {
}

// TODO: allow deletion of version, package, account
func (Delete) Execute(parser *arguments.Parser) error {
	token, err := storage.LoadToken()
	if err != nil {
		return err
	}

	return client.DeleteUserAccount(*token)
}
