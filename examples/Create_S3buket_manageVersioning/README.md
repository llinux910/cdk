```typescript
const maintenanceWindow = new CfnMaintenanceWindow(this, 'MaintenanceWindow', {
  allowUnassociatedTargets: false,
  cutoff: 1,
  duration: 2,
  name: this.stackName,
  schedule: 'cron(0 5 ? * SUN *)',
  scheduleTimezone: 'UTC',
});

const maintenanceWindowTarget = new CfnMaintenanceWindowTarget(this, 'MaintenanceWindowTarget', {
  resourceType: 'INSTANCE',
  targets: [
    {
      key: 'InstanceIds',
      values: [instance.instanceId],
    },
  ],
  windowId: maintenanceWindow.ref,
});

const maintenanceWindowTask = new CfnMaintenanceWindowTask(this, 'MaintenanceWindowTask', {
  maxConcurrency: '1',
  maxErrors: '1',
  priority: 0,
  targets: [
    {
      key: 'WindowTargetIds',
      values: [maintenanceWindowTarget.ref],
    },
  ],
  taskArn: 'AWS-RunPatchBaseline',
  taskInvocationParameters: {
    maintenanceWindowRunCommandParameters: {
      parameters: {
        Operation: ['Install'],
      },
    },
  },
  taskType: 'RUN_COMMAND',
  windowId: maintenanceWindow.ref,
});




```

