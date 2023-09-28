import { execute } from "./compiler.js";

window.Deno = {};
window.Deno.readTextFileSync = (path) => {
	// console.log("Loading " + path);
	return window.vfs[path];
}

window.Deno.stdout = {};
window.Deno.stdout.writeSync = (c) => {
	for (let i = 0; i < c.length; i++) {
		document.getElementById("output").value += String.fromCharCode(c[i]);
	}
}

window.vfs = {};

const files_to_load = [ 
	"stdlib/std.fl",
	"stdlib/impl/io.fl",
	"stdlib/impl/string.fl",
	"stdlib/x86_64-linux-nasm/arch/io.fl",
	"stdlib/x86_64-linux-nasm/arch/mem.fl",
	"stdlib/x86_64-linux-nasm/arch/entry.fl",
	"stdlib/x86_64-linux-nasm/arch/file.fl",
	"example.fl"
];

const promises = [];

for (const f of files_to_load) {
	promises.push(fetch("res/" + f).then(e => e.text().then(e => {
		console.log("Fetched " + f);
		window.vfs[f] = e;
	})));
}

Promise.all(promises).then(() => {
	try {
		execute(decodeURIComponent(location.hash.slice(1)), [ "<hash>" ]);
	} catch(e) {
		document.getElementById("error").innerText = "Failed to compile / run: " + e;
	}
});