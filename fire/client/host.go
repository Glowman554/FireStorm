package client

import (
	"io"
	"net/http"
)

var host = "http://192.168.178.145:4000"

func readResponse(res *http.Response) (*string, error) {
	defer res.Body.Close()
	data, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	dataStr := string(data)
	return &dataStr, nil
}
