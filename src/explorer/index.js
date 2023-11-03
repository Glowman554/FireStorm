import { compile } from "./compiler.js";

const input = document.getElementById("input");

window.Deno = {};
window.Deno.readTextFileSync = (path) => {
	// console.log("Loading " + path);
	return window.vfs[path];
}

let stdout = "";
window.Deno.stdout = {};
window.Deno.stdout.writeSync = (arr) => {
	stdout += new TextDecoder().decode(arr);
}

input.addEventListener('input',  () => {
	try {
		document.getElementById("output").value = compile(input.value, document.getElementById("target").options[document.getElementById("target").selectedIndex].value);
		document.getElementById("error").innerText = "";
	} catch (e) {
		document.getElementById("error").innerText = "Failed to compile: " + e;
		document.getElementById("output").value = stdout;
		stdout = "";
	}
});

document.getElementById("target").onchange = (self) => {
	const event = new Event('input');
	input.dispatchEvent(event);
}


input.addEventListener('keydown',  (e) => {
	if (e.keyCode === 9) {
		e.preventDefault();

		input.setRangeText('\t', input.selectionStart, input.selectionStart, 'end');
	}
});

document.getElementById("example").onclick = () => {
	input.value = Deno.readTextFileSync("example/example.fl");
	input.dispatchEvent(new Event("input"));
}

// document.getElementById("import").onclick = () => {
// 	importLibrary(prompt("Library?"));
// }

window.vfs = {};

const host = "https://cloud.glowman554.de:3877";
function importLibrary(nameAndVersion) {
	const [ name, version ] = nameAndVersion.split("@");

	fetch(`${host}/remote/info?name=${name}&version=${version}`).then(res => res.json().then(res => {
		for (const f in res) {
			fetch(`${host}/remote/get?id=` + res[f]).then(e => e.text().then(e => {
				console.log("Fetched " + f);
				window.vfs[name + "/" + f] = e;
			}))
		}
	}));
}

importLibrary("std@1.0.2");
importLibrary("example@1.0.0");
