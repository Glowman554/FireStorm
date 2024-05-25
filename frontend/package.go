package frontend

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"encore.app/authentication"
	"encore.app/frontend/templates"
	"encore.app/remote"
	"encore.dev/beta/auth"
	"github.com/a-h/templ"
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

			err = remote.CreatePackage(ctx, params.Package)
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

var itemsPerPage = 10

func ListPackage(ctx context.Context, w http.ResponseWriter, r *http.Request) error {
	switch r.Method {
	case "GET":
		pageString := r.URL.Query().Get("page")

		page, err := strconv.Atoi(pageString)
		if err != nil {
			page = 0
		}

		pkgs, err := remote.ListPackages(ctx, &remote.ListPackagesProps{
			Limit:  itemsPerPage,
			Offset: page * itemsPerPage,
		})

		if err != nil {
			return err
		}

		return render(templates.Packages(pkgs.Packages, page+1), ctx, w)
	default:
		return errors.New("invalid method")
	}
}

func PackagePage(user *authentication.User, r *http.Request) (templ.Component, error) {
	if ok := r.URL.Query().Has("package"); !ok {
		return nil, errors.New("missing parameter package")
	}
	packageName := r.URL.Query().Get("package")

	pkg, err := remote.GetPackage(context.Background(), packageName)
	if err != nil {
		return nil, err
	}

	versions, err := remote.GetVersions(context.Background(), packageName)
	if err != nil {
		return nil, err
	}

	return templates.PackagePage(*pkg, versions.Versions), nil
}

func PackageVersionPage(user *authentication.User, r *http.Request) (templ.Component, error) {
	if ok := r.URL.Query().Has("package"); !ok {
		return nil, errors.New("missing parameter package")
	}
	packageName := r.URL.Query().Get("package")

	if ok := r.URL.Query().Has("version"); ok {
		return nil, errors.New("missing parameter version")
	}
	packageVersion := r.URL.Query().Get("version")

	files, err := remote.ListFiles(context.Background(), packageName, &remote.ListFilesProps{
		Version: packageVersion,
	})
	if err != nil {
		return nil, err
	}

	return templates.PackageVersionPage(packageName, packageVersion, files.Files), nil
}
