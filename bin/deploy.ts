#!/usr/bin/env node
import { S3 } from '@aws-sdk/client-s3';
import AdmZip from 'adm-zip';
import { App } from '@aws-cdk/core';
import { CdkStackStatic } from '../lib/cdk-stack-static';
import { tmpdir } from 'os';
import { join } from 'path';

const namespace = process.env.CDK_NAMESPACE!;
const domainName = process.env.CDK_DOMAINNAME!;
const certificateArn = process.env.CDK_CERTIFICATEARN!;
const hostedZoneId = process.env.CDK_HOSTEDZONEID!;
const awsRegion = process.env.CDK_AWSREGION!;
const awsAccount = process.env.CDK_AWSACCOUNT!;
const bucketName = process.env.CDK_BUCKETNAME!;
const zipFileName = `${namespace}.zip`;

main();

async function main() {
  const zip = new AdmZip();
  zip.addLocalFolder('example/website');
  zip.addLocalFile('example/yippie.json');
  zip.writeZip(join(tmpdir(), zipFileName));

  try {
    const s3 = new S3({});
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

  new CdkStackStatic(app, 'CdkStackStatic', {
    id: namespace,
    bucketName,
    zipFileName,
    domainName,
    certificateArn,
    env: { account: awsAccount, region: awsRegion },
  });

  console.log('Successful deplyoed.');
  process.exit(0);
}
