import { compile } from "./compiler.js";

const input = document.getElementById("input");

window.Deno = {};
window.Deno.readTextFileSync = (path) => {
	// console.log("Loading " + path);
	return window.vfs[path];
}

input.addEventListener('input',  () => {
	try {
		document.getElementById("output").value = compile(input.value);
		document.getElementById("error").innerText = "";
	} catch (e) {
		document.getElementById("error").innerText = "Failed to compile: " + e;
	}
});

input.addEventListener('keydown',  (e) => {
	if (e.keyCode === 9) {
		e.preventDefault();

		input.setRangeText('\t', input.selectionStart, input.selectionStart, 'end');
	}
});

document.getElementById("example").onclick = () => {
	input.value = Deno.readTextFileSync("example.fl");
	input.dispatchEvent(new Event("input"));
}

window.vfs = {};

const files_to_load = [ 
	"stdlib/std.fl",
	"stdlib/impl/io.fl",
	"stdlib/impl/mem.fl",
	"example.fl"
];
for (const f of files_to_load) {
	fetch("res/" + f).then(e => e.text().then(e => {
		console.log("Fetched " + f);
		window.vfs[f] = e;
	}))
}