package remote

import (
	"context"

	"encore.dev/storage/sqldb"
)

var db = sqldb.NewDatabase("remote", sqldb.DatabaseConfig{
	Migrations: "./migrations",
})

type Package struct {
	Package string `json:"package"`
	Owner   string `json:"owner"`
	Type    string `json:"type"`
}

func createPackage(ctx context.Context, pkg Package) error {
	_, err := db.Exec(ctx, "insert into packages (package, owner, type) values ($1, $2, $3)", pkg.Package, pkg.Owner, pkg.Type)
	return err
}

func deletePackagesFrom(ctx context.Context, username string) error {
	_, err := db.Exec(ctx, "delete from packages where owner = $1", username)
	return err
}
