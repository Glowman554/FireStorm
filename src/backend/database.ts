import mysql from "npm:mysql2@3.6.2/promise";

const databaseSetup = `
CREATE TABLE IF NOT EXISTS user_account (
    name varchar(100) NOT NULL,
    password_hash varchar(100) NOT NULL,
    PRIMARY KEY (name)
);

CREATE TABLE IF NOT EXISTS user_session (
    name varchar(100) NOT NULL,
    token varchar(100) NOT NULL,
    PRIMARY KEY (token),
    KEY user_session_FK (name),
    CONSTRAINT user_session_FK FOREIGN KEY (name) REFERENCES user_account (name) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS package (
    name varchar(100) NOT NULL,
    packageName varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
    type varchar(100) NOT NULL,
    PRIMARY KEY (packageName),
    KEY package_FK (name),
    CONSTRAINT package_FK FOREIGN KEY (name) REFERENCES user_account (name) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS version (
    packageName varchar(100) NOT NULL,
    version varchar(100) NOT NULL,
    PRIMARY KEY (packageName,version),
    CONSTRAINT version_FK FOREIGN KEY (packageName) REFERENCES package (packageName) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS file (
    fileId int NOT NULL AUTO_INCREMENT,
    fileName text NOT NULL,
    content text NOT NULL,
    version varchar(100) NOT NULL,
    packageName varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
    PRIMARY KEY (fileId),
    KEY file_FK (packageName,version),
    CONSTRAINT file_FK FOREIGN KEY (packageName, version) REFERENCES version (packageName, version) ON DELETE CASCADE ON UPDATE CASCADE
);
`;

export async function setup(connection: mysql.Connection) {
    for (const command of databaseSetup.split(";")) {
        if (command.trim() == "") {
            continue;
        }
        await connection.execute(command);
    }
}