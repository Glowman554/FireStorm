package authentication

import (
	"context"

	"encore.dev/beta/auth"
	"golang.org/x/crypto/bcrypt"
)

type AuthenticationParams struct {
	Username string `json:"username"`
	Password string `json:"password" encore:"sensitive"`
}

type AuthenticationResponse struct {
	Token string `json:"token" encore:"sensitive"`
}

//encore:api public method=POST path=/login
func LoginUser(ctx context.Context, params *AuthenticationParams) (*AuthenticationResponse, error) {
	user, err := loadUser(ctx, params.Username)
	if err != nil {
		return nil, err
	}

	if err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(params.Password)); err != nil {
		return nil, err
	}
	return complete(ctx, params.Username)
}

//encore:api public method=POST path=/create
func CreateUser(ctx context.Context, params *AuthenticationParams) (*AuthenticationResponse, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(params.Password), bcrypt.MinCost)
	if err != nil {
		return nil, err
	}

	err = insertUser(ctx, params.Username, string(hash))
	if err != nil {
		return nil, err
	}
	return complete(ctx, params.Username)
}

type AuthenticationHandlerParams struct {
	Token string `header:"Token"`
}

//encore:authhandler
func AuthHandler(ctx context.Context, token *AuthenticationHandlerParams) (auth.UID, *User, error) {
	user, err := loadUserByToken(ctx, token.Token)
	if err != nil {
		return "", nil, err
	}
	return auth.UID(user.Username), user, nil
}

func complete(ctx context.Context, username string) (*AuthenticationResponse, error) {
	token, err := generateToken()
	if err != nil {
		return nil, err
	}

	err = insertUserSession(ctx, username, token)
	if err != nil {
		return nil, err
	}

	return &AuthenticationResponse{
		Token: token,
	}, nil
}
