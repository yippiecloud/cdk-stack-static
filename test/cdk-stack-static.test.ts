import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import { App } from '@aws-cdk/core';
import { CdkStackStatic } from '../lib/cdk-stack-static';

test('Empty Stack', () => {
  const app = new App();
  // WHEN
  const stack = new CdkStackStatic(app, 'MyTestStack', {
    projectId: 'ABC',
    sourceBucketName: 'yippiecloud-artifacts',
    zipObjectKey: 'mike.bild@gmail.com/website-1630843779966.zip',
    domainName: 'yippie.cloud',
    certificateArn: '',
  });
  // THEN
  expectCDK(stack).to(
    matchTemplate(
      {
        Resources: {},
      },
      MatchStyle.EXACT
    )
  );
});
