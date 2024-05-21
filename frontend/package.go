package frontend

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"encore.app/frontend/templates"
	"encore.app/remote"
	"encore.dev/beta/auth"
)

func CreatePackage(ctx context.Context, w http.ResponseWriter, r *http.Request) error {
	switch r.Method {
	case "POST":
		return withBody(r, func(data []byte) error {
			var params *remote.Package
			err := json.Unmarshal(data, &params)
			if err != nil {
				return err
			}

			user, ok := auth.UserID()
			if !ok {
				return errors.New("not authenticated")
			}
			params.Owner = string(user)

			err = remote.CreatePackage(ctx, params.Package, &remote.CreatePackageProps{Type: params.Type})
			if err != nil {
				return err
			}

			return render(templates.PackageDone(params.Package), ctx, w)
		})
	case "GET":
		return render(templates.PackageCreate(), ctx, w)
	default:
		return errors.New("invalid method")
	}
}
