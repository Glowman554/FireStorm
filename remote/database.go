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
}

type File struct {
	Package
	Name    string `json:"name"`
	Version string `json:"version"`
	Content string `json:"content"`
}

func createPackage(ctx context.Context, pkg Package) error {
	_, err := db.Exec(ctx, "insert into packages (package, owner) values ($1, $2)", pkg.Package, pkg.Owner)
	return err
}

func loadPackage(ctx context.Context, name string) (*Package, error) {
	pkg := &Package{}
	err := db.QueryRow(ctx, "select package, owner from packages where package = $1", name).Scan(&pkg.Package, &pkg.Owner)
	if err != nil {
		return nil, err
	}
	return pkg, nil
}

func deletePackagesFrom(ctx context.Context, username string) error {
	_, err := db.Exec(ctx, "delete from packages where owner = $1", username)
	return err
}

func createFile(ctx context.Context, file File) error {
	_, err := db.Exec(ctx, "insert into files (name, version, content, package) values ($1, $2, $3, $4)", file.Name, file.Version, file.Content, file.Package.Package)
	return err
}
