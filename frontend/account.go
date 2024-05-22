package frontend

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"encore.app/authentication"
	"encore.app/frontend/templates"
)

// func CreateAccount(ctx context.Context, w http.ResponseWriter, r *http.Request) error {
// 	switch r.Method {
// 	case "POST":
// 		return withBody(r, func(data []byte) error {
// 			var params *authentication.AuthenticationParams
// 			err := json.Unmarshal(data, &params)
// 			if err != nil {
// 				return err
// 			}

// 			response, err := authentication.CreateUser(ctx, params)
// 			if err != nil {
// 				return err
// 			}

// 			return render(templates.AccountDone("Successfully created account", response.Token), ctx, w)
// 		})
// 	case "GET":
// 		return render(templates.CredentialsField("/frontend/authentication/create"), ctx, w)
// 	default:
// 		return errors.New("invalid method")
// 	}
// }

func LoginAccount(ctx context.Context, w http.ResponseWriter, r *http.Request) error {
	switch r.Method {
	case "POST":
		return withBody(r, func(data []byte) error {
			var params *authentication.AuthenticationParams
			err := json.Unmarshal(data, &params)
			if err != nil {
				return err
			}

			response, err := authentication.LoginUser(ctx, params)
			if err != nil {
				return err
			}

			return render(templates.AccountDone("Successfully logged in", response.Token), ctx, w)
		})
	case "GET":
		return render(templates.CredentialsField("/frontend/authentication/login"), ctx, w)
	default:
		return errors.New("invalid method")
	}
}

func DeleteAccount(ctx context.Context, w http.ResponseWriter, r *http.Request) error {
	switch r.Method {
	case "GET":
		err := authentication.DeleteUser(ctx)
		if err != nil {
			return err
		}
		return render(templates.AccountDeleted(), ctx, w)
	default:
		return errors.New("invalid method")
	}
}
