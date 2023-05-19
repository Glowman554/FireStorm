const { spawn } = require('child_process');
const fs = require('fs');

function runCommand(command) {
    return new Promise((resolve, reject) => {
        const command_split = command.split(" ");
        const process = spawn(`${command_split.shift()}`, command_split);
    
        let output = '';
    
        process.stdout.on('data', (data) => {
          output += data.toString();
        });
    
        process.stderr.on('data', (data) => {
          reject(new Error(`Execution error: ${data.toString()}`));
        });
    
        process.on('close', (code) => {
          if (code === 0) {
            resolve(output);
          } else {
            reject(new Error(`Execution failed with code ${code}`));
          }
        });
      });
}

const COLOR_RESET = "\u001B[0m";
const RED = "\u001B[31m";
const GREEN = "\u001B[32m";

async function runTest(file) {
  try {
    const expected = JSON.parse(fs.readFileSync(`${file}.expect`, 'utf8'));

    let output = undefined;
    try {
      output = await runCommand(`${file}.elf ${expected.arguments.join(" ")}`);
    } catch (_e) {/**/}

    let passed = true;

    if (output == undefined) {
      if (!expected.should_fail) {
        passed = false;
      }
    } else {
      if (expected.should_fail) {
        passed = false;
      }
      const output_split = output.split("\n");
      for (let i = 0; i < expected.output.length; i++) {
        if (expected.output[i] != "*") {
          if (expected.output[i] != output_split[i]) {
            passed = false;
          }
        }
      }
    }

    let summary = "";

    summary += "=== PROGRAM OUTPUT ===\n";
    summary += output || "DID NOT RUN\n";
    summary += "=== EXPECTED OUTPUT ===\n";
    summary += expected.output.join("\n") + "\n";

    if (passed) {
      summary += "=== TEST PASSED ===";
      console.log(`${GREEN}TEST PASSED:${COLOR_RESET} ${file}`);
    } else {
      summary += "=== TEST NOT PASSED ===";
      console.log(`${RED}TEST NOT PASSED:${COLOR_RESET} ${file}`);
    }

    fs.writeFileSync(`${file}.summary`, summary);
  } catch (e) {
    console.log(RED + `RUN FAILED FOR: ${file}. Reason: ${e}` + COLOR_RESET);
  }
}

async function main() {
  const promises = [];
  for (const dirEntry of fs.readdirSync('.')) {
    if (dirEntry.endsWith(".fl")) {
      promises.push(runTest(`./${dirEntry}`));
    }
  }

  await Promise.all(promises);
  console.log("Test runner done.");
}

main();
