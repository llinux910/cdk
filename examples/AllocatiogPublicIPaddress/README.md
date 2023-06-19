```typescript
    const eip = new ec2.CfnEIP(this, 'MyEIP');

    // Associate the Elastic IP with the EC2 instance
    const eipAssociation = new ec2.CfnEIPAssociation(this, 'MyEIPAssociation', {
      eip: eip.ref,
      instanceId: ec2Instance.instanceId,
    });
```

