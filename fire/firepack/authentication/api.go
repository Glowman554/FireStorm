package authentication

import "fire/firepack"

func Status(token string) (*StatusResponse, error) {
	var res StatusResponse
	err := firepack.ApiGet("/authentication/status", map[string]string{
		"authentication": token,
	}, nil, &res)
	return &res, err
}

func Login(username, password string) (*LoginResponse, error) {
	var res LoginResponse
	err := firepack.ApiGet("/authentication/login", nil, map[string]string{
		"username": username,
		"password": password,
	}, &res)
	return &res, err
}

func Register(username, password string) (*RegisterResponse, error) {
	var res RegisterResponse
	err := firepack.ApiGet("/authentication/register", nil, map[string]string{
		"username": username,
		"password": password,
	}, &res)
	return &res, err
}

func ChangePassword(token, oldPassword, newPassword string) error {
	return firepack.ApiGet("/authentication/changePassword", map[string]string{
		"authentication": token,
	}, map[string]string{
		"oldPassword": oldPassword,
		"newPassword": newPassword,
	}, nil)
}
