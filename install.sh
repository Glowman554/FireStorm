set -ex

deno compile --output flc -A src/index.ts
deno compile --output flr -A src/index.interpret.ts

sudo cp flc /usr/bin/flc
sudo cp flr /usr/bin/flr

sudo mkdir /usr/firestorm/include -p
sudo cp stdlib/* /usr/firestorm/include/ -rfv
