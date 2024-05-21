package remote

import (
	"context"
	"errors"

	"encore.dev/beta/auth"
)

//encore:api auth method=GET path=/package/create/:name
func CreatePackage(ctx context.Context, name string) error {
	uid, ok := auth.UserID()
	if !ok {
		return errors.New("missing uid")
	}
	pkg := Package{
		Owner:   string(uid),
		Package: name,
	}

	err := createPackage(ctx, pkg)
	if err != nil {
		return err
	}

	_, err = PackageCreation.Publish(ctx, &pkg)
	return err
}

type UploadFileProps struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	Content string `json:"content"`
}

//encore:api auth method=POST path=/file/upload/:pkgName
func UploadFile(ctx context.Context, pkgName string, props *UploadFileProps) error {
	uid, ok := auth.UserID()
	if !ok {
		return errors.New("missing uid")
	}

	pkg, err := loadPackage(ctx, pkgName)
	if err != nil {
		return err
	}

	if pkg.Owner != string(uid) {
		return errors.New("you are not allowed to upload to this package")
	}

	return createFile(ctx, File{
		Package: *pkg,
		Name:    props.Name,
		Version: props.Version,
		Content: props.Content,
	})
}

// F250UwKglwNE6WJOOlV4db_OG-ONvy1MB06ceH1MKbDCTolAOBbgzVwG3AgmLf9BcMUMRSnvSTLWImxh3syp81W4J1IKhnTBUOzgQudu7MSGPXyE_-WdhlQ6a_XMOLAbhH6ioA
