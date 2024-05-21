package storage

import "os"

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
