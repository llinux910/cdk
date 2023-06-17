#! /bin/bash


aws configure
aws sts get-caller-identity --query Account --output text && cdk bootstrap aws://$(aws sts get-caller-identity --query Account --output text)/$(aws configure get region)


aws s3 rb "s3://$(aws cloudformation describe-stack-resources --stack-name CDKToolkit --query "StackResources[?ResourceType=='AWS::S3::Bucket'].PhysicalResourceId" --output text)" --force

# CDKToolkit 스택을 삭제합니다.
aws cloudformation delete-stack --stack-name CDKToolkit --region $(aws configure get region)
aws cloudformation describe-stacks --stack-name CDKToolkit --region $(aws configure get region)

