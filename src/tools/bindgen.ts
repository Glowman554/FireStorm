function split_c_signature(signature: string) {
	let return_type = signature.split("(", 1)[0];
	let function_name;
	let attributes;

	if (return_type.split(" ").length == 1) {
		function_name = return_type;
		return_type = " ";
	} else {
		const ret_array = return_type.split(" ");
		let len = ret_array.length;

		function_name = ret_array[len - 1].trim();

		ret_array.pop();
		len--;

		return_type = ret_array[len - 1];
		attributes = "";

		// loop over the reversed array
		let is_ret = true;
		for (let i = len - 2; i >= 0; i--) {
			const _allowed_return_types = ['short', 'long', 'signed', 'unsigned', 'const', 'restrict', 'restrict', 'mutable'];
			if (_allowed_return_types.includes(ret_array[i]) && is_ret) {
				return_type = ret_array[i] + " " + return_type;
			} else {
				is_ret = false;
				attributes = ret_array[i] + " " + attributes;
			}
		}

		return_type = return_type.trim();
		attributes = attributes.trim();
	}

	let class_name = "";
	if (function_name.split("::", 1).length != 1) {
		class_name = function_name.split("::", 1)[0];
		function_name = function_name.split("::", 1)[1];
	}

	if (function_name.startsWith("*")) {
		function_name = function_name.substring(1);
		return_type = "*";
	}

	let params = signature.split("(")[1].split(")")[0].split(",").map(p => p.trim());
    if (params[0] == "") {
        params = [];
    }

	return {
		"return_type": return_type,
		"class_name": class_name,
		"function_name": function_name,
		"attributes": attributes,
		"params": params,
		"signature": signature
	};
}

const datatype_lookup: { [key: string]: string } = {
    "void": "void",
    "char": "chr",
    "const char*": "str",
    "uint32_t": "int",
    "bool": "int"
};


const translations: {id: number, translation: string}[] = [];
let outfl = "";
let outc = ""

function getDatatype(dt: string) {
    if (!datatype_lookup[dt]) {
        const newDt = prompt(`No datatype translation found for ${dt}! Translation? `);
        datatype_lookup[dt] = newDt as string;
    }
    return datatype_lookup[dt];
}

export function addDatatype(dt: string, translation: string) {
    datatype_lookup[dt] = translation;
}

export function functionGen(id: number, sigStr: string) {
    const sig = split_c_signature(sigStr);

    let fl = `function(assembly) ${sig.function_name}(`;
    for (const param of sig.params) {
        const datatype = param.substring(0, param.lastIndexOf(" ")).trim();
        const name = param.substring(param.lastIndexOf(" ")).trim();

 

        fl += getDatatype(datatype);
        fl += " "
        fl += name;
        fl += ", ";
    }

    if (sig.params.length != 0) fl = fl.substring(0, fl.length - 2);
    fl += `) -> ${getDatatype(sig.return_type)} {\n    "${id}"\n}`;

    outfl += fl + "\n";

    let c = `void native_${sig.function_name}(struct vm_instance* vm) {\n`;
    for (let i = sig.params.length; i--; i > 0) {

        const datatype = sig.params[i].substring(0, sig.params[i].lastIndexOf(" ")).trim();
        let name = sig.params[i].substring(sig.params[i].lastIndexOf(" ")).trim();
        name = name == "vm" ? "vm2" : name;

        c += `    ${datatype} ${name} = (${datatype}) stack_pop(vm);\n`;
    }

    if (sig.return_type != "void") {
        c += `    stack_push(vm, ${sig.function_name}(`;
    } else {
        c += `    ${sig.function_name}(`;
    }

    for (const param of sig.params) {
        let name = param.substring(param.lastIndexOf(" ")).trim();
        name = name == "vm" ? "vm2" : name;
        
        c += `${name}, `;
    }

    if (sig.params.length != 0) c = c.substring(0, c.length - 2);

    if (sig.return_type != "void") {
        c += `));\n}`;
    } else {
        c += `);\n    stack_push(vm, 0);\n}`;
    }


    outc += c + "\n";

    translations.push({
        id: id,
        translation: "native_" + sig.function_name 
    });
}

export function finish(include: string, initName = "init") {
    let finalc = include + outc;


    finalc += "void " + initName + "() {\n";
    for (const translation of translations) {
        finalc += `    vm_native_register(${translation.id}, ${translation.translation});\n`;
    }
    finalc += "}";

    return [outfl, finalc];
}