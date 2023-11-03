export interface LoginResponse {
    token: string;
}

export interface InfoResponse { [key: string ]: number };

let backendUrl = "https://cloud.glowman554.de:3877";

if (Deno.env.has("FLP_BACKEND")) {
    backendUrl = Deno.env.get("FLP_BACKEND") as string;
}

export function apiCall(path: string, body: string | undefined = undefined): Promise<object> {
    return new Promise<object>((resolve, reject) => {
        fetch(`${backendUrl}${path}`, {
            method: body ? "POST" : "GET",
            body: body
        }).then(res => res.json().then(res => {
            if (res.error) {
                reject(res.error);
            } else {
                resolve(res);
            }
        }));
    });
}

export function fetchFile(fileId: number): Promise<string> {
    return new Promise<string>((resolve, _reject) => {
        fetch(`${backendUrl}/remote/get?id=${fileId}`).then(res => res.text().then(res => {
            resolve(res);
        }));
    });
}

// TODO: change
const tokenPath = "/usr/firestorm/flp_token.txt";

export function saveToken(token: string | undefined) {
    if (token) {
        Deno.writeTextFileSync(tokenPath, token);
    } else {
        Deno.removeSync(tokenPath);
    }
}

export async function loadToken(): Promise<string | undefined> {
    try {
        const token = Deno.readTextFileSync(tokenPath);
        await apiCall(`/user/test?token=${token}`);
        return token;
    } catch (_e) {
        return undefined;
    }
}