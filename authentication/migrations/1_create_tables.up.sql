CREATE TABLE users (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL
);

CREATE TABLE sessions (
  username TEXT NOT NULL,
  token TEXT PRIMARY KEY,
  timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_username FOREIGN KEY (username) REFERENCES users (username) ON DELETE CASCADE ON UPDATE CASCADE
);