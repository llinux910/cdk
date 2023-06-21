이 코드는 주로 다음과 같은 작업을 수행하기 위해 사용됩니다:

1. CloudTrail을 사용하여 AWS 계정 내에서 실행된 EC2 인스턴스의 생성 이벤트를 감지합니다.

2. CloudTrail 로그를 저장하기 위한 S3 버킷(trailBucket)을 생성합니다.

3. CloudTrail을 통해 EC2 인스턴스 생성 이벤트를 감지하고, 해당 이벤트에 대한 CloudWatch Events 규칙을 생성합니다.

4. 생성된 CloudWatch Events 규칙은 EC2 인스턴스 생성 이벤트가 발생할 때마다 Lambda 함수(ec2OwnerTagFunction)를 실행하여 EC2 인스턴스에 소유자 태그를 추가합니다.


코드의 주요 동작 흐름은 다음과 같습니다:

1. TrailBucket이라는 이름의 S3 버킷을 생성합니다. 이 버킷은 CloudTrail 로그를 저장하기 위한 용도로 사용됩니다. 버킷 이름은 스택의 이름과 '-trail-bucket'을 조합하여 생성됩니다.

2. trailBucket에 대한 버킷 정책(Policy)을 추가합니다. 버킷 정책은 CloudTrail 서비스(principals)에게 특정 작업(actions) 및 리소스(resources)에 대한 권한을 부여합니다. 첫 번째 정책은 버킷의 ACL(Access Control List)을 확인하는 권한을 부여하고, 두 번째 정책은 CloudTrail이 로그를 해당 버킷에 기록할 수 있도록 허용합니다.

3. Trail이라는 이름의 CloudTrail을 생성합니다. 이 CloudTrail은 이전에 생성한 trailBucket에 로그를 저장하는 데 사용됩니다. TrailProps 객체를 사용하여 CloudTrail에 대한 구성을 제공합니다.

4. trail에 대해 S3 이벤트 선택기(S3EventSelector)를 추가합니다. 이 선택기는 특정 버킷에서 발생하는 S3 객체 생성 이벤트에 대한 알림을 활성화합니다.

5. 'EC2OwnerTagFunction'이라는 이름의 Lambda 함수를 생성합니다. 이 함수는 EC2 인스턴스에 소유자 태그를 추가하는 데 사용됩니다. Python 3.9 런타임을 사용하며, 'lambda_function.lambda_handler'를 핸들러로 설정하고, 로컬 파일 시스템의 'lambda' 폴더에서 코드를 가져옵니다. 함수의 메모리 크기와 실행 시간 제한도 설정되며, 환경 변수로 'AWS_NODEJS_CONNECTION_REUSE_ENABLED'를 사용합니다.

6. ec2OwnerTagFunction에 대해 역할 정책(PolicyStatement)을 추가합니다. 이 정책은 모든 리소스에 대해 'ec2:CreateTags' 작업을 수행할 수 있는 권한을 부여합니다.

7. EC2 'RunInstances' 이벤트에 대한 이벤트 패턴(EventPattern)을 정의합니다. 이벤트 패턴은 CloudTrail에서 발생한 EC2 API 호출 이벤트를 필터링하는 데 사용됩니다.

8. 생성된 이벤트 패턴을 사용하여 CloudWatch Events 규칙(Rule)을 생성합니다. 이 규칙은 이벤트 패턴과 일치하는 이벤트가 발생할 때, Lambda 함수(ec2OwnerTagFunction)를 실행하도록 구성됩니다.

