set -ex

deno compile --output flc -A src/index.ts
deno compile --output flr -A src/index.interpret.ts
deno compile --output flbr -A src/flbr.ts

sudo cp flc /usr/bin/flc
sudo cp flr /usr/bin/flr
sudo cp flbr /usr/bin/flbr

sudo mkdir /usr/firestorm/include -p
sudo cp stdlib/* /usr/firestorm/include/ -rfv
