#!/usr/bin/env node
import { S3 } from '@aws-sdk/client-s3';
import AdmZip from 'adm-zip';
import { App, Tags } from '@aws-cdk/core';
import { CdkStackStatic } from '../lib/cdk-stack-static';
import { tmpdir } from 'os';
import { join } from 'path';
import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';
import { config } from 'dotenv';
import { SdkProvider } from 'aws-cdk/lib/api/aws-auth';
import { CloudFormationDeployments } from 'aws-cdk/lib/api/cloudformation-deployments';
import { StackActivityProgress } from 'aws-cdk/lib/api/util/cloudformation/stack-activity-monitor';

const optionDefinitions = [
  {
    name: 'command',
    alias: 'd',
    type: String,
    defaultOption: true,
    description: 'Command to execute.',
  },
  {
    name: 'folder',
    alias: 'f',
    type: String,
    description: 'Folder to deploy.',
  },
  { name: 'help', alias: 'h', type: Boolean, description: 'Display this usage guide.' },
  { name: 'verbose', alias: 'v', type: Boolean, description: 'Enable verbose outputs.' },
];
const options = commandLineArgs(optionDefinitions);

if (options.help) {
  const usage = commandLineUsage([
    { header: 'Usage', content: 'cdk-stack-static <foldername>' },
    { header: 'Options', optionList: optionDefinitions },
    { content: '' },
  ]);
  console.log(usage);
}

const { folder = 'example/website', verbose = false } = commandLineArgs(optionDefinitions);
const { parsed } = config({ debug: verbose }) as any;
const {
  CDK_NAMESPACE: namespace,
  CDK_DOMAINNAME: domainName,
  CDK_CERTIFICATEARN: certificateArn,
  CDK_HOSTEDZONEID: hostedZoneId,
  CDK_AWSREGION: awsRegion,
  CDK_AWSACCOUNT: awsAccount,
  CDK_BUCKETNAME: bucketName,
} = parsed;
const timestamp = Date.now();
const zipFileName = `${namespace}-${timestamp}.zip`;
const stackName = `${namespace}-StackStatic`;

switch (options.command) {
  case 'destroy':
    destroy();
    break;
  default:
    deploy();
    break;
}

async function deploy() {
  console.log(`Zip folder ${folder}.`);
  const zip = new AdmZip();
  zip.addLocalFolder(folder);
  zip.writeZip(join(tmpdir(), zipFileName));

  try {
    console.log(`Upload zip to ${bucketName}/${zipFileName}.`);
    const s3 = new S3({ region: awsRegion });
    await s3.putObject({ Bucket: bucketName, Key: zipFileName, Body: zip.toBuffer() });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }

  const app = new App({
    context: {
      [`hosted-zone:account=${awsAccount}:domainName=${domainName}:region=${awsRegion}`]: {
        Id: `/hostedzone/${hostedZoneId}`,
        Name: `${domainName}.`,
      },
    },
  });
  Tags.of(app).add('namespace', namespace);

  const stack = new CdkStackStatic(app, stackName, {
    id: namespace,
    bucketName,
    zipFileName,
    domainName,
    certificateArn,
    env: { account: awsAccount, region: awsRegion },
  });

  const stackArtifact = app.synth().getStackByName(stack.stackName);
  const sdkProvider = await SdkProvider.withAwsCliCompatibleDefaults({});
  const cloudFormation = new CloudFormationDeployments({ sdkProvider });

  try {
    console.log(`Deploying of ${stackArtifact.stackName}...`);
    await cloudFormation.deployStack({
      stack: stackArtifact,

      progress: StackActivityProgress.EVENTS,
      hotswap: true,
      tags: [{ Key: 'namespace', Value: namespace }],
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }

  console.log(`Deployment of ${stackArtifact.stackName} done.`);
  process.exit(0);
}

async function destroy() {
  const app = new App();
  Tags.of(app).add('namespace', namespace);

  const stack = new CdkStackStatic(app, stackName, {
    id: namespace,
    bucketName,
    zipFileName,
    domainName,
    certificateArn,
    env: { account: awsAccount, region: awsRegion },
  });

  const stackArtifact = app.synth().getStackByName(stack.stackName);
  const sdkProvider = await SdkProvider.withAwsCliCompatibleDefaults({});
  const cloudFormation = new CloudFormationDeployments({ sdkProvider });

  try {
    console.log(`Destoying of ${stackArtifact.stackName} ...`);
    await cloudFormation.destroyStack({ stack: stackArtifact });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }

  console.log(`Stack ${stackArtifact.stackName} destroyed.`);
  process.exit(0);
}
