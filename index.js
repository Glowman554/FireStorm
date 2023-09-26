import { compile } from "./compiler.js";

const input = document.getElementById("input");

window.Deno = {};
window.Deno.readTextFileSync = (path) => {
	// console.log("Loading " + path);
	return window.vfs[path];
}

input.addEventListener('input',  () => {
	try {
		document.getElementById("output").value = compile(input.value, document.getElementById("target").options[document.getElementById("target").selectedIndex].value);
		document.getElementById("error").innerText = "";
	} catch (e) {
		document.getElementById("error").innerText = "Failed to compile: " + e;
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
	input.value = Deno.readTextFileSync("example.fl");
	input.dispatchEvent(new Event("input"));
}

document.getElementById("run").onclick = () => {
	window.open("./run.html#" + encodeURIComponent(input.value), "_blank");
}


window.vfs = {};

const files_to_load = [ 
	"stdlib/std.fl",
	"stdlib/impl/io.fl",
	"stdlib/impl/string.fl",
	"stdlib/x86_64-linux-nasm/arch/io.fl",
	"stdlib/x86_64-linux-nasm/arch/mem.fl",
	"stdlib/x86_64-linux-nasm/arch/entry.fl",
	"stdlib/riscv64-linux-gnu/arch/io.fl",
	"stdlib/riscv64-linux-gnu/arch/mem.fl",
	"stdlib/riscv64-linux-gnu/arch/entry.fl",
	"stdlib/bytecode/arch/io.fl",
	"stdlib/bytecode/arch/mem.fl",
	"stdlib/bytecode/arch/entry.fl",
	"example.fl"
];
for (const f of files_to_load) {
	fetch("res/" + f).then(e => e.text().then(e => {
		console.log("Fetched " + f);
		window.vfs[f] = e;
	}))
}