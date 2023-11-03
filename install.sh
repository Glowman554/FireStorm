set -ex

deno compile --output flc -A src/flc/index.ts
deno compile --output flp -A src/flp/index.ts
# deno compile --output flr -A src/index.interpret.ts
gcc src/flvm/runtime.c -o flvm

sudo mv flc /usr/bin/flc
sudo mv flp /usr/bin/flp
# sudo cp flr /usr/bin/flr
sudo mv flvm /usr/bin/flvm

sudo mkdir /usr/firestorm/include -p
sudo cp stdlib/* /usr/firestorm/include/ -rfv
