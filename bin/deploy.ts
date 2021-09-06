#!/usr/bin/env node
import { App } from '@aws-cdk/core';
import { CdkStackStatic } from '../lib/cdk-stack-static';

const namespace = process.env.CDK_NAMESPACE!;
const domainName = process.env.CDK_DOMAINNAME!;
const certificateArn = process.env.CDK_CERTIFICATEARN!;
const hostedZoneId = process.env.CDK_HOSTEDZONEID!;
const awsRegion = process.env.CDK_AWSREGION!;
const awsAccount = process.env.CDK_AWSACCOUNT!;

const app = new App({
  context: {
    [`hosted-zone:account=${awsAccount}:domainName=${domainName}:region=${awsRegion}`]: {
      Id: `/hostedzone/${hostedZoneId}`,
      Name: `${domainName}.`,
    },
  },
});

new CdkStackStatic(app, 'CdkStackStaticStack', {
  projectId: 'abcdef',
  sourceBucketName: 'yippiecloud-artifacts',
  zipObjectKey: 'mike.bild@gmail.com/website-1630843779966.zip',
  domainName,
  certificateArn,
  env: { account: awsAccount, region: awsRegion },
});
