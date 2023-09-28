set -ex

deno compile --output flc -A src/index.ts
deno compile --output flr -A src/index.interpret.ts
gcc src/runtime.c -o flvm

sudo cp flc /usr/bin/flc
sudo cp flr /usr/bin/flr
sudo cp flvm /usr/bin/flvm

sudo mkdir /usr/firestorm/include -p
sudo cp stdlib/* /usr/firestorm/include/ -rfv
