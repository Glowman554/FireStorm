package client

import (
	"io"
	"net/http"
	"os"
)

var host = "https://production-firestorm-tkk2.encr.app"

func readResponse(res *http.Response) (*string, error) {
	defer res.Body.Close()
	data, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	dataStr := string(data)
	return &dataStr, nil
}

func init() {
	if _, ok := os.LookupEnv("STAGING"); ok {
		host = "https://staging-firestorm-tkk2.encr.app"
	}
	if h, ok := os.LookupEnv("BACKEND"); ok {
		host = h
	}
}
