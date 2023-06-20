import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';


import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Trail, TrailProps, S3EventSelector } from 'aws-cdk-lib/aws-cloudtrail';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { Rule, EventPattern } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Duration } from 'aws-cdk-lib/core';

export class Ec2CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // S3 Bucket for CloudTrail logs
    const trailBucket = new Bucket(this, 'TrailBucket', {
   bucketName: `${this.stackName.toLowerCase()}-trail-bucket`,
    });

    // Bucket policy for CloudTrail
    trailBucket.addToResourcePolicy(
      new PolicyStatement({
        sid: 'AWSCloudTrailAclCheck',
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal('cloudtrail.amazonaws.com')],
        actions: ['s3:GetBucketAcl'],
        resources: [trailBucket.bucketArn],
      })
    );

    trailBucket.addToResourcePolicy(
      new PolicyStatement({
        sid: 'AWSCloudTrailWrite',
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal('cloudtrail.amazonaws.com')],
        actions: ['s3:PutObject'],
        resources: [trailBucket.arnForObjects(`AWSLogs/${process.env.AWS_ACCOUNT_ID}/*`)],
        conditions: {
          StringEquals: {
            's3:x-amz-acl': 'bucket-owner-full-control',
          },
        },
      })
    );

    // CloudTrail
    const trailProps: TrailProps = {
      bucket: trailBucket,
    };
    const trail = new Trail(this, 'Trail', trailProps);
    trail.addS3EventSelector([{ bucket: trailBucket, objectPrefix: 's3:ObjectCreated:*' }]);

    // Lambda function for adding owner tag to EC2 instances
    const ec2OwnerTagFunction = new Function(this, 'EC2OwnerTagFunction', {
      runtime: Runtime.PYTHON_3_9,
      handler: 'lambda_function.lambda_handler',
      code: Code.fromAsset('lambda'),
      memorySize: 256,
      timeout: Duration.seconds(30),
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
    });

    ec2OwnerTagFunction.addToRolePolicy(
      new PolicyStatement({
        actions: ['ec2:CreateTags'],
        resources: ['*'],
        effect: Effect.ALLOW,
      })
    );

    // Event pattern for EC2 RunInstances events
    const eventPattern: EventPattern = {
      source: ['aws.ec2'],
      detailType: ['AWS API Call via CloudTrail'],
      detail: {
        eventSource: ['ec2.amazonaws.com'],
        eventName: ['RunInstances'],
      },
    };

    // CloudWatch Events rule to trigger the Lambda function
    const eventRule = new Rule(this, 'EventBridgeRule', {
      eventPattern,
    });
    eventRule.addTarget(new LambdaFunction(ec2OwnerTagFunction));
  }
}
