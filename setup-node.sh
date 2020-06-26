#!/bin/bash

# A bash script to download a version of nodejs, extract the executable and remove the archive.
NODE_RUNTIME_DIR=$PWD/runtime
NODE_DIR=$NODE_RUNTIME_DIR/nodejs
NODE_TAR=nodejs.tar.xz
NODE_TAR_DIR=$NODE_DIR/$NODE_TAR
NODE_DOWNLOAD_LINK=https://nodejs.org/dist/$npm_package_config_node_version/node-$npm_package_config_node_version-linux-x64.tar.xz

if [[ -z $npm_package_config_node_version ]]; then
  echo "Please provided the node_version variable in the package.json"
  exit 1
fi

if [[ ! -e $NODE_TAR_DIR ]]; then
echo "Downloading node.js ${npm_package_config_node_version} from ${NODE_DOWNLOAD_LINK}"
  curl -J $NODE_DOWNLOAD_LINK  --create-dirs -o $NODE_TAR_DIR
fi

# Extract the binary to nodejs/bin/node
echo "Extracting /bin/node binary"
tar -xvf $NODE_TAR_DIR -C $NODE_DIR --strip-components 1 --include="**/bin/node"

# Check if the use wants to delete the file downloaded.
read -rp "Remove archive files? [y/n]"

if [[ ${REPLY} =~ ^(n|no)$ ]]; then
  exit 0;
else
  echo "Removing downloaded binaries..."
  rm -rf $NODE_TAR_DIR
  echo "Done!"
fi