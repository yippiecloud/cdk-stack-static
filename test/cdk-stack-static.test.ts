import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import { App } from '@aws-cdk/core';
import { CdkStackStatic } from '../lib/cdk-stack-static';

test('Empty Stack', () => {
  const app = new App();
  // WHEN
  const stack = new CdkStackStatic(app, 'MyTestStack', {
    id: 'ABC',
    bucketName: '',
    zipFileName: '',
    domainName: '',
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
