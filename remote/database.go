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

func deletePackage(ctx context.Context, pkg string) error {
	_, err := db.Exec(ctx, "delete from packages where package = $1", pkg)
	return err
}

func createFile(ctx context.Context, file File) error {
	_, err := db.Exec(ctx, "insert into files (name, version, content, package) values ($1, $2, $3, $4)", file.Name, file.Version, file.Content, file.Package.Package)
	return err
}

func loadVersionFileList(ctx context.Context, version string, pkg string) ([]string, error) {
	rows, err := db.Query(ctx, "select name from files where version = $1 and package = $2", version, pkg)
	if err != nil {
		return nil, err
	}

	result := []string{}
	for rows.Next() {
		var entry string
		err = rows.Scan(&entry)
		if err != nil {
			return nil, err
		}
		result = append(result, entry)
	}

	return result, nil
}

func loadFile(ctx context.Context, name string, version string, pkg string) (*string, error) {
	var content *string
	return content, db.QueryRow(ctx, "select content from files where name = $1 and version = $2 and package = $3", name, version, pkg).Scan(&content)
}

func deletePackageVersion(ctx context.Context, pkg string, version string) error {
	_, err := db.Exec(ctx, "delete from files where package = $1 and version = $2", pkg, version)
	return err
}
