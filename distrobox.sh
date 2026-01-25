#!/bin/bash

DISTROBOX_NAME="firestorm-build-box"

if distrobox list | grep -q "$DISTROBOX_NAME "; then
    echo "Distrobox '$DISTROBOX_NAME' already exists."
else
    distrobox-create --name $DISTROBOX_NAME --image debian:latest

    distrobox-enter $DISTROBOX_NAME -- /bin/bash -c "
    sudo apt update
    sudo apt install -y gcc git build-essential golang-go clang

    git config --global user.email \"vossjanick62@gmail.com\"
    git config --global user.name \"Glowman554\"
    git config --global credential.helper 'store --file ~/.my-credentials'

    curl -fsSL \"https://code.visualstudio.com/sha/download?build=stable&os=linux-deb-x64\" -o vscode.deb
    sudo dpkg -i vscode.deb
    sudo apt -f install -y
    rm vscode.deb
    "
fi

distrobox-enter $DISTROBOX_NAME -- code .
