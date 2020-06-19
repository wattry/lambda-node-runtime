# Lambda Custom NodeJS Runtime Tutorial
This project attempts to provide clarity on how build, use and deploy a custom runtime using AWS Serverless application model (SAM). The most important factor being reusability. This project is for educational purposes and custom runtimes are a product advertised by AWS support.

This example will be presented as a case study where an application has a dependency on NodeJS 12.16.1. Since AWS uses the LTS version on NodeJS our application is incompatible with these higher versions. Thus we have to create a custom runtime to accommodate for this.

Ideally the runtime layer and lambda function should be managed in separate sam templates however for the purpose of this example they are deployed together. A Sam Application Repository is a good way to deploy lambda layers for reuse, however at this time one cannot easily access the layers using sam.

## Contents
1. Understanding the SAM workflows
    1. build
        * runtime
        * lambda
    2. deploy
    3. invoke
2. 

Custom runtimes require extra steps in order to setup the most importantly understanding the build process.

## Understanding SAM workflows

1. build
2. deploy
3. invoke (options)

### Build

Sam gathers dependencies and creates a new template.yaml and moved these resource to .aws-sam/build. This new template is used to deploy.

#### Runtime

To build a custom nodejs runtime several files must be in place. 

* bootstrap file 
* index.js - this handles the actual work with the event loop.
* node v12.16.1 executable

The runtime/aws directory contains the files aws uses on their base image to execute a user provided function. These steps are detailed here [more information](https://docs.aws.amazon.com/lambda/latest/dg/runtimes-custom.html). It is important to understand these events in order to write your own bootstrap and event loop handlers. However, one can use these provided files as long as they are compatible with the version of node.

Steps:

1. Download nodejs binary - ```npm run download```
2. Remove previous files (optional) - ```npm run remove-nodejs```
3. untar new build - ```npm run untar```
4. remove tar files (optional) - ```npm run remove-tar```

These steps will make node v12.16.1 binaries available to the runtime directory.

#### Lambda
Sam uses the Runtime property on the AWS::Serverless::Function resource to decide what workflow to use and
what image to apply when executing the lambda function in the respective container. In our case we want to use a custom runtime, so sam leaves it up to us to gather the files needed to execute our lambda.

To use a provided lambda, from sam v0.51, you will need to included a makefile in your lambda function source code.
This makefile must bundle, compile/transpile and install all the dependencies needed to execute the lambda.

In this example node_modules (npm install) and copy our source code to the .aws-sam/build directory.

We can now run ```sam build``` and to test we can a ```sam local invoke``` we should now see our function execute using our node binary.

### Deploy

When sam builds a deploy template is output to .aws-sam/build/template.yaml that references the resources relative to this directory.

#### Runtime

On deploy the runtime directory and its contents are placed in /opt and the runtime directory falls away. The lambda container expects the bootstrap file to be in the /opt. The bootstrap file points to /opt/aws/index.js and /opt/nodejs/bin/node and executes the call that comes from an event.

#### Lambda

The lambda code is pushed to an S3 bucket and can be seen in the Lambda designer if it does not [exceed 3MB](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html). To work around this we can create other custom layers that contain our projects node_modules. However, in this case we do not have any dependencies.

Once you have gone through the build and deploy steps you can invoke your lambda from your browser, the AWS console or the cli.

Thank you for going through this tutorial. You should be able to create your own nodejs custom layers.