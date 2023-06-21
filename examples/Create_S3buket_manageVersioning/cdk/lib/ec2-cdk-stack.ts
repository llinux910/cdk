import { Construct } from "constructs";

import * as cdk from 'aws-cdk-lib';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';

export class S3BucketStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucketName = 'my-unique-bucket-name2';
    const localFolderPath = 'testFolder';

    // Create an S3 bucket
    const bucket: IBucket = new Bucket(this, 'MyBucket', {
      bucketName: bucketName,
      publicReadAccess: true,
       versioned: true, // Enable versioning for the buck
    });

    // Deploy files from local folder to the bucket
    new BucketDeployment(this, 'BucketDeployment', {
      sources: [Source.asset(localFolderPath)],
      destinationBucket: bucket,
    });
  }
}


