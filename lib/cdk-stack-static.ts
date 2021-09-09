import { StackProps, Construct, Stack, CfnOutput, RemovalPolicy } from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';
import { BucketDeployment, Source } from '@aws-cdk/aws-s3-deployment';
import { OriginAccessIdentity, CloudFrontWebDistribution, CloudFrontAllowedMethods } from '@aws-cdk/aws-cloudfront';
import { StringParameter } from '@aws-cdk/aws-ssm';
import { CloudFrontTarget, BucketWebsiteTarget } from '@aws-cdk/aws-route53-targets';
import { ARecord, RecordTarget, HostedZone } from '@aws-cdk/aws-route53';
import { Certificate } from '@aws-cdk/aws-certificatemanager';

interface CdkStackStaticProps extends StackProps {
  id: string;
  zipFileName: string;
  bucketName: string;
  domainName: string;
  certificateArn: string;
}

export class CdkStackStatic extends Stack {
  constructor(scope: Construct, id: string, props: CdkStackStaticProps) {
    super(scope, id, props);
    const { id: deployId, bucketName, zipFileName, domainName, certificateArn } = props;

    const sourceBucket = Bucket.fromBucketName(this, 'BucketName', bucketName);
    const destinationBucket = new Bucket(this, 'DestinationBucket', {
      bucketName: `${deployId}-preview.${domainName}`,
      removalPolicy: RemovalPolicy.DESTROY,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: true,
    });

    new CfnOutput(this, 'DestinationBucketDomainNameOutput', {
      value: destinationBucket.bucketDomainName,
    });

    const staticID = new OriginAccessIdentity(this, 'CloudFrontOriginAccessIdentity');
    destinationBucket.grantRead(staticID);

    const certificate = Certificate.fromCertificateArn(this, `CloudFrontWebCertificate`, certificateArn);

    const distribution = new CloudFrontWebDistribution(this, 'CloudFrontDistribution', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: destinationBucket,
            originAccessIdentity: staticID,
          },
          behaviors: [
            {
              allowedMethods: CloudFrontAllowedMethods.ALL,
              forwardedValues: {
                queryString: true,
                cookies: {
                  forward: 'all',
                },
              },
              isDefaultBehavior: true,
            },
          ],
        },
      ],
      aliasConfiguration: {
        acmCertRef: certificate.certificateArn,
        names: [`${deployId}.${domainName}`],
      },
      errorConfigurations: [
        {
          errorCode: 404,
          responsePagePath: '/index.html',
          responseCode: 200,
        },
      ],
    });

    const zone = HostedZone.fromLookup(this, `BaseZone`, {
      domainName,
    });

    new ARecord(this, `CloudFrontAliasRecord`, {
      zone,
      recordName: `${deployId}.${domainName}`,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    new ARecord(this, `WebsiteAliasRecord`, {
      zone,
      recordName: `${deployId}-preview.${domainName}`,
      target: RecordTarget.fromAlias(new BucketWebsiteTarget(destinationBucket)),
    });

    new BucketDeployment(this, 'StaticContentDeployment', {
      destinationBucket: destinationBucket,
      sources: [Source.bucket(sourceBucket, zipFileName)],
      retainOnDelete: false,

      prune: true,
      distribution,
      distributionPaths: ['/*'],
    });

    new CfnOutput(this, 'DistributionDomainNameOuput', {
      value: `${deployId}.${domainName}`,
    });

    new CfnOutput(this, 'BucketDomainNameOuput', {
      value: `${deployId}-preview.${domainName}`,
    });

    new StringParameter(this, 'DistributionDomainName', {
      parameterName: `/yippiecloud/${deployId}/PRODUCTION_URL`,
      stringValue: `${deployId}.${domainName}`,
    });

    new StringParameter(this, 'BucketDomainName', {
      parameterName: `/yippiecloud/${deployId}/PREVIEW_URL`,
      stringValue: `${deployId}-preview.${domainName}`,
    });
  }
}
