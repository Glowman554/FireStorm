import mysql from "npm:mysql2@3.6.2/promise";
import { create, ErrorMode, Route, Router, set_logger } from "https://deno.land/x/simple_router@0.8/mod.ts";
import { serve, serveTls } from "https://deno.land/std@0.204.0/http/mod.ts";
import { createUserRoute, loginUserRoute, logoutUserRoute, testUserRoute, deleteUserRoute } from "./user.ts";
import { initRemoteRoute, deploymentRemoteRoute, uploadRemoteRoute, infoRemoteRoute, getRemoteRoute, deleteInitRemoteRoute, deleteDeploymentRemoteRoute } from "./remote.ts";
import { setup } from "./database.ts";

export const ri: ResponseInit = {
	headers: {
		"Access-Control-Allow-Origin": "*",
	},
};

function add(router: Router, route: Route) {
    router.add(route.path, route.handler, route.method);
}

interface SslConfig {
    key: string;
    cert: string;
}

const port = 3877;

async function main() {
    set_logger({
		logger: console.log,
	});

    const connection = await mysql.createPool({...JSON.parse(Deno.readTextFileSync(Deno.args[0] + "database.json")),
        waitForConnections: true,
        connectionLimit: 2,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
    });
    await setup(connection);

	const { router, reqHandler } = create(ErrorMode.ERROR_JSON);

    add(router, createUserRoute(connection));
    add(router, loginUserRoute(connection));
    add(router, logoutUserRoute(connection));
    add(router, testUserRoute(connection));
    add(router, deleteUserRoute(connection));

    add(router, initRemoteRoute(connection));
    add(router, deploymentRemoteRoute(connection));
    add(router, uploadRemoteRoute(connection));
    add(router, infoRemoteRoute(connection));
    add(router, getRemoteRoute(connection));
    add(router, deleteInitRemoteRoute(connection));
    add(router, deleteDeploymentRemoteRoute(connection));


    let sslConfig: SslConfig | undefined;
    try {
        sslConfig = JSON.parse(Deno.readTextFileSync(Deno.args[0] + "ssl.json")) as SslConfig;
    } catch (e) {
        console.log(e);
    }

    if (sslConfig) {
        serveTls(reqHandler, {
            port: port,
            certFile: sslConfig.cert,
            keyFile: sslConfig.key,
            onListen: (params) => {
                console.log("Listening on " + params.hostname + ":" + params.port);
            },
        });
    } else {
        serve(reqHandler, {
            port: port,
            onListen: (params) => {
                console.log("Listening on " + params.hostname + ":" + params.port);
            },
        });
    }
}

main();
