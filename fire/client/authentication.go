package client

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
)

type AuthenticationParams struct {
	Username string `json:"username"`
	Password string `json:"password" encore:"sensitive"`
}

type AuthenticationResponse struct {
	Token string `json:"token" encore:"sensitive"`
}

func accountCommon(path string, username string, password string) (*string, error) {
	params := AuthenticationParams{
		Username: username,
		Password: password,
	}

	data, err := json.Marshal(params)
	if err != nil {
		return nil, err
	}
	r := bytes.NewReader(data)

	res, err := http.Post(host+path, "application/json", r)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	if res.StatusCode != http.StatusOK {
		return nil, errors.New(string(body))
	}

	var response *AuthenticationResponse
	err = json.Unmarshal(body, &response)
	if err != nil {
		return nil, err
	}

	return &response.Token, nil
}

func CreateUserAccount(username string, password string) (*string, error) {
	return accountCommon("/user/create", username, password)
}

func LoginUserAccount(username string, password string) (*string, error) {
	return accountCommon("/user/login", username, password)
}

func withToken(token string, method string, path string, body io.Reader) (*http.Request, error) {
	req, err := http.NewRequest(method, host+path, body)
	if err != nil {
		return nil, err
	}
	req.AddCookie(&http.Cookie{
		Name:  "token",
		Value: token,
		Path:  "/",
	})
	if body != nil {
		req.Header.Add("Content-Type", "application/json")
	}
	return req, nil
}

func DeleteUserAccount(token string) error {
	req, err := withToken(token, "GET", host+"/user/delete", nil)
	if err != nil {
		return err
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	if res.StatusCode != http.StatusOK {
		str, err := readResponse(res)
		if err != nil {
			return err
		}
		return errors.New(*str)
	}
	return nil
}
