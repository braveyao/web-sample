# Prerequisite
Before proceeding with the installation, make sure you have downloaded the _**latest**_ version of the _**tgz**_ file of the _**develop**_ branch (e.g., ecprt-client-sdk-0.0.1-develop.9.tgz) from the following link: **[Download Link](https://artifactory-builds.oci.oraclecorp.com/cgbu_ecprt-dev-generic-local/ecprt-livekit-client-sdk-js/)**.

# Installing Dependencies
To install and set up the web sample app, follow the steps below:

## Step 1: Clean
In the root directory of the web sample app, open a terminal or command prompt and run the following commands to clean the project dependencies and build artifacts:

```shell
npm cache clean --force # Clear the npm cache forcefully
npm install # make sure VPN is off
npm run clean # Clean the build artifacts
```

## Step 2: Install and Build
After cleaning the project, continue with the installation and build process by executing the following commands:

```shell
npm install [filename] # Provide the path to the latest downloaded tgz file
npm run sample # Run the sample application
```

***
Remember to replace _**[filename]**_ with the actual filename of the downloaded tgz file.
# Note if you are facing 403 in browser reload:
```
//use vpn
//take fresh clone of client-sdk-js
git submodule update --init --recursive --remote
npm config set registry "https://artifacthub-iad.oci.oraclecorp.com/api/npm/npmjs-registry"
npm config set strict-ssl false
//run cmd in ecprt-livekit-client-sdk-js to build sdk from source.
npm install --verbose
npm run build
npm pack
npm install ecprt-client-sdk-2.1.3.tgz
cd sample/web
//here did not run build cmds
npm run sample

This 403 on browser reload issue is seen while running "npm run sample" cmd if we see "VITE v4.5.13", but it should "VITE v5.3.2" 
```