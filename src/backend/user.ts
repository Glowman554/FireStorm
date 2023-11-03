import mysql from "npm:mysql2@3.6.2/promise";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.2.4/mod.ts";
import { Route } from "https://deno.land/x/simple_router@0.8/mod.ts";
import { ri } from "./index.ts";

function newToken() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    let str = "";
    for (let i = 0; i < 99; i++) {
        str += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return str;
}

export async function resolveUserName(token: string, connection: mysql.Connection): Promise<string> {
    const [rows, _fields] = await connection.execute("select name from `user_session` where token = ?", [ token ]);
    if (rows.length == 0) {
        throw new Error("Invalid token");
    } else {
        return rows[0].name;
    }
}

export function secureRoute(route: Route, connection: mysql.Connection): Route {
    async function handle(req: Request): Promise<Response> {
        const url = new URL(req.url);
        const token = url.searchParams.get("token");
        if (token == null) {
            throw new Error("Missing token!");
        }

        await resolveUserName(token, connection);
        return route.handler(req);
    }

    return {
        path: route.path,
        handler: handle,
        method: route.method
    }
}

export function createUserRoute(connection: mysql.Connection): Route {
    return {
        path: "/user/create",
        handler: async (req: Request): Promise<Response> => {
            const url = new URL(req.url);

            const name = url.searchParams.get("name");
            if (name == null) {
                throw new Error("Missing name!");
            }
            const password = url.searchParams.get("password");
            if (password == null) {
                throw new Error("Missing password!");
            }

            await connection.execute("insert into `user_account` (name, password_hash) values (?, ?)", [ name, bcrypt.hashSync(password) ]);

            return new Response(JSON.stringify({}), ri);
        },
        method: "GET"

    }
}

export function loginUserRoute(connection: mysql.Connection): Route {
    return {
        path: "/user/login",
        handler: async (req: Request): Promise<Response> => {
            const url = new URL(req.url);

            const name = url.searchParams.get("name");
            if (name == null) {
                throw new Error("Missing name!");
            }
            const password = url.searchParams.get("password");
            if (password == null) {
                throw new Error("Missing password!");
            }

            const [rows, _fields] = await connection.execute("select password_hash from `user_account` where name = ?", [ name ]);
            if (rows.length == 0 || !bcrypt.compareSync(password, rows[0].password_hash)) {
                throw new Error("Invalid username or password!");
            }
                
            const token = newToken();
            await connection.execute("insert into `user_session` (name, token) values (?, ?)", [ name, token ]);

            return new Response(JSON.stringify({
                token: token
            }), ri);
        },
        method: "GET"

    }
}

export function logoutUserRoute(connection: mysql.Connection): Route {
    return secureRoute({
        path: "/user/logout",
        handler: async (req: Request): Promise<Response> => {
            const url = new URL(req.url);

            const token = url.searchParams.get("token") as string;
            await connection.execute("delete from `user_session` where token = ?", [ token ]);

            return new Response(JSON.stringify({}), ri);
        },
        method: "GET"

    }, connection);
}

export function testUserRoute(connection: mysql.Connection): Route {
    return secureRoute({
        path: "/user/test",
        handler: (_req: Request): Promise<Response> => {
            return Promise.resolve(new Response(JSON.stringify({}), ri));
        },
        method: "GET"
    }, connection);
}

export function deleteUserRoute(connection: mysql.Connection): Route {
    return secureRoute({
        path: "/user/delete",
        handler: async (req: Request): Promise<Response> => {
            const url = new URL(req.url);

            const token = url.searchParams.get("token") as string;
            const user = await resolveUserName(token, connection);

            await connection.execute("delete from `user_account` where name = ?", [ user ]);

            return new Response(JSON.stringify({}), ri);
        },
        method: "GET"

    }, connection);
}