package authentication

import (
	"crypto/rand"
	"encoding/base64"
)

func generateToken() (string, error) {
	var data [100]byte
	if _, err := rand.Read(data[:]); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(data[:]), nil
}
