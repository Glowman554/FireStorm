package authentication

import (
	"context"

	"encore.dev/storage/sqldb"
)

var db = sqldb.NewDatabase("authentication", sqldb.DatabaseConfig{
	Migrations: "./migrations",
})

type User struct {
	Username     string `json:"username"`
	PasswordHash string `encore:"sensitive"`
}

func insertUser(ctx context.Context, username string, passwordHash string) error {
	_, err := db.Exec(ctx, `insert into users (username, password_hash) values ($1, $2)`, username, passwordHash)
	return err
}

func insertUserSession(ctx context.Context, username string, token string) error {
	_, err := db.Exec(ctx, `insert into sessions (username, token) values ($1, $2)`, username, token)
	return err
}

func loadUser(ctx context.Context, username string) (*User, error) {
	user := &User{
		Username: username,
	}

	err := db.QueryRow(ctx, `select password_hash from users where username = $1`, username).Scan(&user.PasswordHash)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func loadUserByToken(ctx context.Context, token string) (*User, error) {
	user := &User{}

	err := db.QueryRow(ctx, `select sessions.username, password_hash from users, sessions where users.username = sessions.username and token = $1`, token).Scan(&user.Username, &user.PasswordHash)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func deleteUser(ctx context.Context, username string) error {
	_, err := db.Exec(ctx, "delete from users where username = $1", username)
	return err
}

func updateUserPasswordHash(ctx context.Context, username string, hash string) error {
	_, err := db.Exec(ctx, `update users set password_hash = $1 where username = $2`, hash, username)
	return err
}

func cleanup(ctx context.Context) error {
	_, err := db.Exec(ctx, `delete from sessions where timestamp < now() - interval '30 days'`)
	return err
}
