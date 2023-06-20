import * as cdk from 'aws-cdk-lib';
import { CreateEC2instance } from '../lib/ec2-cdk-stack';

const app = new cdk.App();

new CreateEC2instance(app, 'CreateEC2instance', {});

