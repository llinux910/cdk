11

In April 2023 AWS must have changed bucket defaults, 
a fix for AWS CDK projects would be adding blockPublicAccess together with accessControl props as follows:

```typescript
import { BlockPublicAccess, BucketAccessControl } from "aws-cdk-lib/aws-s3"; ....

// Content bucket
const bucket = new s3.Bucket(this, "Bucket", {
  blockPublicAccess: BlockPublicAccess.BLOCK_ACLS,
  accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,

```
