set -ex
deno bundle compiler.ts > compiler.js
mkdir -p res
cp ../stdlib ./res/ -rfv
cp ../tests/powers_of_two.fl ./res/example.fl