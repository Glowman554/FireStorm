import { apiCall, fetchFile, InfoResponse } from "./api.ts";
import { loadProject } from "./project.ts";
import { decodeBase64 } from "https://deno.land/std@0.212.0/encoding/base64.ts";

export async function downloadIfNecessary(nameAndVersion: string) {
    Deno.mkdirSync("modules", {
        recursive: true
    });

    try {
        loadProject(nameAndVersion);
    } catch (_e) {
        await downloadTo(nameAndVersion, "modules/" + nameAndVersion);

        const module = loadProject(nameAndVersion);

        for (const i of module.dependencies || []) {
            await downloadIfNecessary(i);
        }
    }
}

export async function downloadTo(nameAndVersion: string, folder: string) {
    if (!folder.endsWith("/")) {
        folder += "/";
    }

    console.log("Downloading " + nameAndVersion);

    const [ name, version ] = nameAndVersion.split("@");

    Deno.mkdirSync(folder, {
        recursive: true
    });

    const info = await apiCall(`/remote/info?name=${name}&version=${version}`) as InfoResponse;
    for (const i in info) {
        const path = i.split("/");
        path.pop();

        Deno.mkdirSync(folder + path.join("/"), {
            recursive: true
        });

        if (i.endsWith(".so")) {
            Deno.writeFileSync(folder + i, decodeBase64(await fetchFile(info[i])));
        } else {
            Deno.writeTextFileSync(folder + i, await fetchFile(info[i]));
        }
    }
}

export function readIncludes(module: string | undefined = undefined, includes: string[] = []) {
    const project = loadProject(module);
    for (const i of project.dependencies || []) {
        if (!includes.includes(i)) {
            includes.push(i);
            readIncludes(i, includes);
        }
    }

    return includes;
}