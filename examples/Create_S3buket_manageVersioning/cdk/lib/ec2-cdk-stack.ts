import { Construct } from "constructs";

import * as cdk from 'aws-cdk-lib';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Effect, PolicyStatement, AnyPrincipal } from 'aws-cdk-lib/aws-iam';
import { BlockPublicAccess, BucketAccessControl } from "aws-cdk-lib/aws-s3";


export class S3BucketStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucketName = 'my-unique-bucket-name3';
    const localFolderPath = 'testFolder';

    // Create an S3 bucket
    const bucket: IBucket = new Bucket(this, 'MyBucket', {
      bucketName: bucketName,
      publicReadAccess: true,
    });

    // Add bucket policy to allow public read access
    const bucketPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['*'],
      resources: [bucket.bucketArn + '/*'],
      principals: [new AnyPrincipal()], // Allow public access to all objects in the bucket
    });
    bucket.addToResourcePolicy(bucketPolicyStatement);

    // Deploy files from local folder to the bucket
    new BucketDeployment(this, 'BucketDeployment', {
      sources: [Source.asset(localFolderPath)],
      destinationBucket: bucket,
    });
  }
}

