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







