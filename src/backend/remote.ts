import mysql from "npm:mysql2@3.6.2/promise";
import { Route } from "https://deno.land/x/simple_router@0.8/mod.ts";
import { ri } from "./index.ts";
import { secureRoute, resolveUserName } from "./user.ts";

export function initRemoteRoute(connection: mysql.Connection): Route {
    return secureRoute({
        path: "/remote/init",
        handler: async (req: Request): Promise<Response> => {
            const url = new URL(req.url);
            const token = url.searchParams.get("token") as string;
            const user = await resolveUserName(token, connection);

            const name = url.searchParams.get("name");
            if (name == null) {
                throw new Error("Missing name!");
            }
            const type = url.searchParams.get("type");
            if (type == null) {
                throw new Error("Missing type!");
            }
            if (type != "module" && type != "executable") {
                throw new Error("Invalid package type!");
            }
            
            await connection.execute("insert into `package` (name, packageName, type) values (?, ?, ?)", [ user, name, type ]);

            return new Response(JSON.stringify({}), ri);
        },
        method: "GET"

    }, connection);
}

async function checkOwnership(url: URL, connection: mysql.Connection) {
    const token = url.searchParams.get("token") as string;
    const user = await resolveUserName(token, connection);

    const name = url.searchParams.get("name");
    if (name == null) {
        throw new Error("Missing name!");
    }
   
    const [rows, _fields] = await connection.execute("select name from `package` where packageName = ?", [ name ]);
    if (rows.length == 0) {
        throw new Error("Package not found!");
    }
    if (rows[0].name != user) {
        throw new Error("Can only deploy to your own packages!");
    }

    return { name, user };
}

export function deploymentRemoteRoute(connection: mysql.Connection): Route {
    return secureRoute({
        path: "/remote/deployment",
        handler: async (req: Request): Promise<Response> => {
            const url = new URL(req.url);
            const { name, user: _user } = await checkOwnership(url, connection);
            const version = url.searchParams.get("version");
            if (version == null) {
                throw new Error("Missing version!");
            }
           
            await connection.execute("insert into `version` (packageName, version) values (?, ?)", [ name, version ]);

            return new Response(JSON.stringify({}), ri);
        },
        method: "GET"

    }, connection);
}

export function uploadRemoteRoute(connection: mysql.Connection): Route {
    return secureRoute({
        path: "/remote/upload",
        handler: async (req: Request): Promise<Response> => {
            const url = new URL(req.url);
            const { name, user: _user } = await checkOwnership(url, connection);
            const version = url.searchParams.get("version");
            if (version == null) {
                throw new Error("Missing version!");
            }
            const file = url.searchParams.get("file");
            if (file == null) {
                throw new Error("Missing file!");
            }

            await connection.execute("insert into `file` (fileName, packageName, version, content) values (?, ?, ?, ?)", [ file, name, version, await req.text() ]);

            return new Response(JSON.stringify({}), ri);
        },
        method: "POST"

    }, connection);
}

export function infoRemoteRoute(connection: mysql.Connection): Route {
    return {
        path: "/remote/info",
        handler: async (req: Request): Promise<Response> => {
            const url = new URL(req.url);
            const name = url.searchParams.get("name");
            if (name == null) {
                throw new Error("Missing name!");
            }
            const version = url.searchParams.get("version");
            if (version == null) {
                throw new Error("Missing version!");
            }

            const [rows, _fields] = await connection.execute("select fileId, fileName from version, file where version.version = file.version and version.packageName = file.packageName and version.packageName = ? and version.version = ?", [ name, version ]);
            if (rows.length == 0) {
                throw new Error("Package not found!");
            }

            const files: { [key: string ]: number } = {};
            for (const f of rows) {
                files[f.fileName] = f.fileId;
            }

            return new Response(JSON.stringify(files), ri);
        },
        method: "GET"

    };
}

export function getRemoteRoute(connection: mysql.Connection): Route {
    return {
        path: "/remote/get",
        handler: async (req: Request): Promise<Response> => {
            const url = new URL(req.url);
            
            const id = url.searchParams.get("id");
            if (id == null) {
                throw new Error("Missing id!");
            }

            const [rows, _fields] = await connection.execute("select content from file where fileId = ?", [ id ]);
            if (rows.length == 0) {
                throw new Error("File not found!");
            }

            return new Response(rows[0].content, ri);
        },
        method: "GET"

    };
}

export function deleteInitRemoteRoute(connection: mysql.Connection): Route {
    return secureRoute({
        path: "/remote/init/delete",
        handler: async (req: Request): Promise<Response> => {
            const url = new URL(req.url);
            const { name, user } = await checkOwnership(url, connection);
            // const version = url.searchParams.get("version");
            // if (version == null) {
            //     throw new Error("Missing version!");
            // }
           
            await connection.execute("delete from `package` where packageName = ? and name = ?", [ name, user ]);

            return new Response(JSON.stringify({}), ri);
        },
        method: "GET"

    }, connection);
}

export function deleteDeploymentRemoteRoute(connection: mysql.Connection): Route {
    return secureRoute({
        path: "/remote/deployment/delete",
        handler: async (req: Request): Promise<Response> => {
            const url = new URL(req.url);
            const { name, user: _user } = await checkOwnership(url, connection);
            const version = url.searchParams.get("version");
            if (version == null) {
                throw new Error("Missing version!");
            }
           
            await connection.execute("delete from `version` where packageName = ? and version = ?", [ name, version ]);

            return new Response(JSON.stringify({}), ri);
        },
        method: "GET"

    }, connection);
}