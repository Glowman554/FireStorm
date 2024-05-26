package storage

import (
	"context"
	"fire/client"
	"os"
)

var tokenFile = ".firetoken"

func StoreToken(token string) error {
	return os.WriteFile(tokenFile, []byte(token), os.ModePerm)
}
func LoadToken() (*string, error) {
	data, err := os.ReadFile(tokenFile)
	if err != nil {
		return nil, err
	}
	token := string(data)
	return &token, nil
}

func TokenOption() client.Option {
	return client.WithAuthFunc(func(ctx context.Context) (client.AuthenticationAuthenticationHandlerParams, error) {
		token, err := LoadToken()
		if err != nil {
			return client.AuthenticationAuthenticationHandlerParams{}, err
		}
		return client.AuthenticationAuthenticationHandlerParams{Authorization: *token}, nil
	})
}
