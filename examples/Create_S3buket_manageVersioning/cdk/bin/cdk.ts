import * as cdk from 'aws-cdk-lib';
import { S3BucketStack} from '../lib/ec2-cdk-stack';

const app = new cdk.App();
new S3BucketStack(app, 'MyS3BucketStack');

