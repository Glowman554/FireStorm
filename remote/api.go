package remote

import (
	"context"
	"errors"

	"encore.dev/beta/auth"
	"encore.dev/rlog"
)

type CreatePackageProps struct {
	Type string `json:"type"`
}

func validType(t string) bool {
	switch t {
	case "LIBRARY":
		return true
	case "EXECUTABLE":
		return true
	default:
		return false
	}
}

//encore:api auth method=POST path=/package/create/:name
func CreatePackage(ctx context.Context, name string, props *CreatePackageProps) error {
	uid, ok := auth.UserID()
	if !ok {
		return errors.New("missing uid")
	}
	if !validType(props.Type) {
		return errors.New("invalid type")
	}
	pkg := Package{
		Owner:   string(uid),
		Package: name,
		Type:    props.Type,
	}

	err := createPackage(ctx, pkg)
	if err != nil {
		return err
	}

	_, err = PackageCreation.Publish(ctx, &pkg)
	return err
}

// F250UwKglwNE6WJOOlV4db_OG-ONvy1MB06ceH1MKbDCTolAOBbgzVwG3AgmLf9BcMUMRSnvSTLWImxh3syp81W4J1IKhnTBUOzgQudu7MSGPXyE_-WdhlQ6a_XMOLAbhH6ioA
