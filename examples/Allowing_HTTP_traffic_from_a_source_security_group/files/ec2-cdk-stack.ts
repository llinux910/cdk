import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class Ec2CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create new VPC with 2 Subnets
    const vpc = new ec2.Vpc(this, 'VPC', {
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'asterisk',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    // Use Latest Amazon Linux Image - CPU Type ARM64
    const ami = new ec2.AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      cpuType: ec2.AmazonLinuxCpuType.ARM_64
    });

    // Allow SSH (TCP Port 22) access from anywhere
    const securityGroupProxy = new ec2.SecurityGroup(this, 'SecurityGroupProxy', {
      vpc,
      description: 'Allow incoming HTTP and ICMP from anywhere.',
      allowAllOutbound: true,
    });
    securityGroupProxy.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.allTraffic(), 'Allow all traffic');

    const securityGroupBackend = new ec2.SecurityGroup(this, 'SecurityGroupBackend', {
      vpc,
      description: 'Allow incoming HTTP from the proxy.',
      allowAllOutbound: true,
    });
    securityGroupBackend.addIngressRule(securityGroupProxy, ec2.Port.tcp(80), 'Allow HTTP traffic from the proxy');

    const role = new iam.Role(this, 'ec2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });
    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));

    const backendUserData = ec2.UserData.forLinux();
    backendUserData.addCommands(
      '#!/bin/bash -ex',
      'trap \'/opt/aws/bin/cfn-signal -e 1 --stack ${AWS::StackName} --resource Backend --region ${AWS::Region}\' ERR',
      'yum -y install httpd',
      'systemctl start httpd',
      `echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Hello AWS in Action!</title></head><body><p>Hello AWS in Action!</p></body></html>' > /var/www/html/index.html`,
      '/opt/aws/bin/cfn-signal -e 0 --stack ${AWS::StackName} --resource Backend --region ${AWS::Region}',
    );

    const backend = new ec2.Instance(this, 'Backend', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      machineImage: ami,
      securityGroup: securityGroupBackend,
      role,
      userData: backendUserData,
    });

    const proxyUserData = ec2.UserData.forLinux();
    proxyUserData.addCommands(
      '#!/bin/bash -ex',
      'trap \'/opt/aws/bin/cfn-signal -e 1 --stack ${AWS::StackName} --resource Proxy --region ${AWS::Region}\' ERR',
      'amazon-linux-extras install haproxy2',
      `cat <<"EOF" | tee /etc/haproxy2/haproxy2.cfg > /dev/null
# ---------------------------------------------------------------------
# Example configuration for a possible web application.  See the
# full configuration options online.
#
#   https://www.haproxy.org/download/1.8/doc/configuration.txt
#
#---------------------------------------------------------------------

#---------------------------------------------------------------------
# Global settings
#---------------------------------------------------------------------
global
    log         127.0.0.1 local2

    chroot      /var/lib/haproxy2
    pidfile     /var/run/haproxy2.pid
    maxconn     4000
    user        haproxy
    group       haproxy
    daemon

    # turn on stats unix socket
    stats socket /var/lib/haproxy2/stats

    # utilize system-wide crypto-policies
    ssl-default-bind-ciphers PROFILE=SYSTEM
    ssl-default-server-ciphers PROFILE=SYSTEM

#---------------------------------------------------------------------
# common defaults that all the 'listen' and 'backend' sections will
# use if not designated in their block
#---------------------------------------------------------------------
defaults
    mode                    http
    log                     global
    option                  httplog
    option                  dontlognull
    option http-server-close
    option forwardfor       except 127.0.0.0/8
    option                  redispatch
    retries                 3
    timeout http-request    10s
    timeout queue           1m
    timeout connect         10s
    timeout client          1m
    timeout server          1m
    timeout http-keep-alive 10s
    timeout check           10s
    maxconn                 3000

#---------------------------------------------------------------------
# main frontend which proxies to the backends
#---------------------------------------------------------------------
frontend main
    bind *:80
    default_backend             app

#---------------------------------------------------------------------
# round robin balancing between the various backends
#---------------------------------------------------------------------
backend app
    balance     roundrobin
    http-response set-header X-Backend %s
    server  app1 ${backend.instancePrivateIp}:80 check
EOF`,
      'systemctl start haproxy2',
      '/opt/aws/bin/cfn-signal -e 0 --stack ${AWS::StackName} --resource Proxy --region ${AWS::Region}',
    );

    const proxy = new ec2.Instance(this, 'Proxy', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      machineImage: ami,
      securityGroup: securityGroupProxy,
      role,
      userData: proxyUserData,
    });

    // 프록시 인스턴스가 백엔드 인스턴스에 종속되도록 설정
    proxy.node.addDependency(backend);

    // Create outputs for connecting
    new cdk.CfnOutput(this, 'ProxyPublicIpAddress', { value: proxy.instancePublicIp, description: 'Proxy public IP address' });
    new cdk.CfnOutput(this, 'BackendPublicIpAddress', { value: backend.instancePublicIp, description: 'Backend public IP address' });
  }
}

