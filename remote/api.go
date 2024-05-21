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

//encore:api auth method=GET path=/package/delete/full/:name
func DeletePackage(ctx context.Context, name string) error {
	uid, ok := auth.UserID()
	if !ok {
		return errors.New("missing uid")
	}

	pkg, err := loadPackage(ctx, name)
	if err != nil {
		return err
	}

	if pkg.Owner != string(uid) {
		return errors.New("you are not allowed to delete this package")
	}
	return deletePackage(ctx, name)
}

type DeletePackageVersionProps struct {
	Version string `json:"version"`
}

//encore:api auth method=GET path=/package/delete/version/:name
func DeletePackageVersion(ctx context.Context, name string, props *DeletePackageVersionProps) error {
	uid, ok := auth.UserID()
	if !ok {
		return errors.New("missing uid")
	}

	pkg, err := loadPackage(ctx, name)
	if err != nil {
		return err
	}

	if pkg.Owner != string(uid) {
		return errors.New("you are not allowed to delete this package version")
	}
	return deletePackageVersion(ctx, name, props.Version)
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

type ListFilesProps struct {
	Version string `json:"version"`
}
type ListFilesResponse struct {
	Files []string `json:"files"`
}

//encore:api public method=GET path=/package/list/:pkgName
func ListFiles(ctx context.Context, pkgName string, props *ListFilesProps) (*ListFilesResponse, error) {
	files, err := loadVersionFileList(ctx, props.Version, pkgName)
	if err != nil {
		return nil, err
	}
	return &ListFilesResponse{
		Files: files,
	}, nil
}

type LoadFileProps struct {
	Version string `json:"version"`
	Name    string `json:"name"`
}
type LoadFileResponse struct {
	Content string `json:"content"`
}

//encore:api public method=GET path=/package/load/file/:pkgName
func LoadFile(ctx context.Context, pkgName string, props *LoadFileProps) (*LoadFileResponse, error) {
	content, err := loadFile(ctx, props.Name, props.Version, pkgName)
	if err != nil {
		return nil, err
	}
	return &LoadFileResponse{
		Content: *content,
	}, nil
}

// F250UwKglwNE6WJOOlV4db_OG-ONvy1MB06ceH1MKbDCTolAOBbgzVwG3AgmLf9BcMUMRSnvSTLWImxh3syp81W4J1IKhnTBUOzgQudu7MSGPXyE_-WdhlQ6a_XMOLAbhH6ioA
