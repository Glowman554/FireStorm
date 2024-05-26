package authentication

import (
	"context"
	"errors"
	"net/http"
	"strings"

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

//encore:api public method=POST path=/user/login
func LoginUser(ctx context.Context, params *AuthenticationParams) (*AuthenticationResponse, error) {
	if strings.TrimSpace(params.Password) == "" || strings.TrimSpace(params.Username) == "" {
		return nil, errors.New("neither password nor username should be empty")
	}

	user, err := loadUser(ctx, params.Username)
	if err != nil {
		return nil, err
	}

	if err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(params.Password)); err != nil {
		return nil, err
	}
	return complete(ctx, params.Username)
}

//encore:api public method=POST path=/user/create
func CreateUser(ctx context.Context, params *AuthenticationParams) (*AuthenticationResponse, error) {
	if strings.TrimSpace(params.Password) == "" || strings.TrimSpace(params.Username) == "" {
		return nil, errors.New("neither password nor username should be empty")
	}
	err := isValidPassword(params.Password)
	if err != nil {
		return nil, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(params.Password), bcrypt.MinCost)
	if err != nil {
		return nil, err
	}

	err = insertUser(ctx, params.Username, string(hash))
	if err != nil {
		return nil, err
	}

	_, err = UserCreation.Publish(ctx, &User{
		Username:     params.Username,
		PasswordHash: string(hash),
	})
	if err != nil {
		return nil, err
	}

	return complete(ctx, params.Username)
}

//encore:api auth method=GET path=/user/delete
func DeleteUser(ctx context.Context) error {
	user, ok := auth.Data().(*User)
	if !ok {
		return errors.New("no valid user data")
	}

	err := deleteUser(ctx, user.Username)
	if err != nil {
		return err
	}

	_, err = UserDeletion.Publish(ctx, user)
	if err != nil {
		return err
	}

	return nil
}

type AuthenticationHandlerParams struct {
	Token         *http.Cookie `cookie:"token"`
	Authorization string       `header:"Authorization"`
}

//encore:authhandler
func AuthHandler(ctx context.Context, params *AuthenticationHandlerParams) (auth.UID, *User, error) {
	token := params.Authorization
	if params.Token != nil {
		token = params.Token.Value
	}
	user, err := loadUserByToken(ctx, token)
	if err != nil {
		return "", nil, err
	}
	return auth.UID(user.Username), user, nil
}

type ChangePasswordUserParams struct {
	NewPassword string `json:"new_password" encore:"sensitive"`
	OldPassword string `json:"old_password" encore:"sensitive"`
}

//encore:api auth method=POST path=/user/password/change
func ChangePasswordUser(ctx context.Context, params *ChangePasswordUserParams) error {
	user, ok := auth.Data().(*User)
	if !ok {
		return errors.New("no valid user data")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(params.OldPassword)); err != nil {
		return err
	}

	if err := isValidPassword(params.NewPassword); err != nil {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(params.NewPassword), bcrypt.MinCost)
	if err != nil {
		return err
	}

	if err := updateUserPasswordHash(ctx, user.Username, string(hash)); err != nil {
		return err
	}

	return nil
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
