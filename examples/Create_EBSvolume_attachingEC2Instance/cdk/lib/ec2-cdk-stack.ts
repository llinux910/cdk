import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";


import {Size} from "aws-cdk-lib";
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
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), "Allow SSH Access");

    const role = new iam.Role(this, "ec2Role", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com")
    });

    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"));

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

    // Create the EBS volume and attach it to the instance
    const volume = new ec2.Volume(this, 'Volume', {
      availabilityZone: ec2Instance.instanceAvailabilityZone,
      size: Size.gibibytes(5),
      volumeType: ec2.EbsDeviceVolumeType.GP2,
    });

    const mountPoint = '/dev/xvdf';

    const volumeAttachment = new ec2.CfnVolumeAttachment(this, 'VolumeAttachment', {
      device: mountPoint,
      instanceId: ec2Instance.instanceId,
      volumeId: volume.volumeId,
    });


    ec2Instance.addUserData(`
    sudo mkfs -t xfs ${mountPoint}
    sudo mkdir /data
    sudo mount ${mountPoint} /data
`);


    new cdk.CfnOutput(this, 'InstanceId', {
      value: ec2Instance.instanceId,
      description: 'Instance id (connect via Session Manager)',
    });

    new cdk.CfnOutput(this, 'VolumeId', {
      value: volume.volumeId,
      description: 'ID of the EBS volume',
    });

    // Create outputs for connecting
    new cdk.CfnOutput(this, "IP Address", { value: ec2Instance.instancePublicIp });
    new cdk.CfnOutput(this, "Session Manager Session", { value: ec2Instance.instanceId });
  }
}

