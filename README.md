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
After cleaning the project, check if the DeepFilterNet WASM files are under public/. If not, copy df.js, df-bg.wams and DeepFilterNet3_onnx.tar.gz
from ./node_modules/denoise-plugin/dist/ to ./public/ afte installation of denoise-plugin.
Continue with the installation and build process by executing the following commands:

```shell
npm install denoise-plugin-x.x.x.tgz # Provide the path to the latest downloaded denoise-plugin tgz file
npm run sample # Run the sample application
```
