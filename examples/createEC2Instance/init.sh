#! /bin/bash


aws configure

STACK_NAME="CDKToolkit"

# Check if CDK Toolkit stack exists
aws cloudformation describe-stacks --stack-name $STACK_NAME >/dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "CDK Toolkit stack ($STACK_NAME) already exists."
else
  echo "CDK Toolkit stack ($STACK_NAME) does not exist. Bootstrapping CDK Toolkit..."

  # Get AWS account ID and region
  AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
  AWS_REGION=$(aws configure get region)

  # Bootstrap CDK Toolkit
  cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION

  if [ $? -eq 0 ]; then
    echo "CDK Toolkit bootstrapping completed successfully."
  else
    echo "CDK Toolkit bootstrapping failed."
    exit 1
  fi
fi

mkdir cdk
cd cdk
cdk init --language typescript

mkdir -p src
echo '
#!/bin/bash -xe

# Update with optional user data that will run on instance start.
# Learn more about user-data: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
' > src/config.sh

cat<< EOF> bin/cdk.ts
import * as cdk from 'aws-cdk-lib';
import { Ec2CdkStack } from '../lib/ec2-cdk-stack';

const app = new cdk.App();

new Ec2CdkStack(app, 'Ec2CdkStack', {});

EOF


rm -rf lib/*

echo '
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export class Ec2CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create new VPC with 2 Subnets
    const vpc = new ec2.Vpc(this, "VPC", {
      natGateways: 0,
      subnetConfiguration: [{
        cidrMask: 24,
        name: "asterisk",
        subnetType: ec2.SubnetType.PUBLIC
      }]
    });

    // Allow SSH (TCP Port 22) access from anywhere
    const securityGroup = new ec2.SecurityGroup(this, "SecurityGroup", {
      vpc,
      description: "Allow SSH (TCP port 22) in",
      allowAllOutbound: true
    });
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), "Allow SSH Access")

    const role = new iam.Role(this, "ec2Role", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com")
    })

    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"))

    // Use Latest Amazon Linux Image - CPU Type ARM64
    const ami = new ec2.AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      cpuType: ec2.AmazonLinuxCpuType.ARM_64
    });

    // Create the instance using the Security Group, AMI, and IAM Role defined in the VPC created
    const ec2Instance = new ec2.Instance(this, "Instance", {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      machineImage: ami,
      securityGroup: securityGroup,
      role: role
    });

    // Create outputs for connecting
    new cdk.CfnOutput(this, "IP Address", { value: ec2Instance.instancePublicIp });
    new cdk.CfnOutput(this, "Session Manager Session", { value: ec2Instance.instanceId });
  }
}

' > lib/ec2-cdk-stack.ts


npm run build
cdk deploy


