EC2에 붙여진 ESB를 사용하려면 파일시스템을 지정해주고, 할당해주어야함


```typescript
ec2Instance.addUserData(`
    sudo mkfs -t xfs ${mountPoint}
    sudo mkdir /data
    sudo mount ${mountPoint} /data
`);

```
