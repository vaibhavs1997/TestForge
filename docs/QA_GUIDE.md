# TestForge QA Guide

**Version:** 1.0.0  
**Last Updated:** 2025-08-05  
**Audience:** QA engineers, testers, quality managers

---

## Table of Contents

1. [Introduction](#introduction)
2. [Testing Strategy](#testing-strategy)
3. [Test Planning](#test-planning)
4. [Test Design](#test-design)
5. [Test Execution](#test-execution)
6. [Test Data Management](#test-data-management)
7. [Assertions & Validation](#assertions--validation)
8. [Reporting & Analytics](#reporting--analytics)
9. [CI/CD Integration](#cicd-integration)
10. [Best Practices](#best-practices)
11. [QA Metrics](#qa-metrics)

---

## Introduction

TestForge is designed to support the entire QA lifecycle from test planning to execution and reporting. This guide helps QA teams leverage TestForge's capabilities effectively.

### QA Workflow in TestForge

```
Project Analysis → Requirements → Test Strategy → Test Design → Execution → Reporting
```

---

## Testing Strategy

### Defining Test Strategy

1. **Navigate to Requirements**
2. Select a requirement
3. Click **Review** to open the requirement details
4. Go to **Test Strategy** tab
5. Click **Plan Test Strategy**

### Strategy Categories

TestForge organizes test strategies into categories:

- **Positive**: Valid input scenarios
- **Negative**: Invalid input scenarios
- **Boundary**: Edge cases and limits
- **Business Rules**: Business logic validation
- **Security**: Authentication, authorization, injection
- **Validation**: Input validation rules
- **Error Handling**: Error scenarios
- **Integration**: API integration tests
- **Regression**: Regression test cases
- **Performance**: Load and stress tests
- **Accessibility**: WCAG compliance
- **Localization**: Multi-language support

### Strategy Items

Each strategy item includes:
- **Title**: Test case name
- **Priority**: High, Medium, Low
- **Reason**: Why this test is important
- **Related APIs**: APIs being tested
- **Related Data**: Test data needed
- **Status**: Enabled or Disabled

---

## Test Planning

### Project Analysis

Run project analysis to discover APIs:

1. **Navigate to Requirements**
2. Click **Re-analyze Project**
3. Wait for analysis to complete
4. Review discovered APIs and endpoints

### Generating Requirements from Analysis

1. After analysis, click **Generate from Analysis**
2. Review suggested requirements
3. Approve or reject each requirement
4. Add custom requirements as needed

### Requirement Review Process

1. **Review**: Examine requirement details
2. **Validate Readiness**: Check if requirement has enough information
3. **Approve/Reject**: Update requirement status
4. **Archive**: Move old requirements to archive

---

## Test Design

### Creating Test Designs

Test designs specify how to test a requirement:

1. Open requirement in **Review** mode
2. Go to **Test Design** tab
3. Click **Generate Test Designs** (AI-powered) or create manually

### Test Design Components

#### Operation
- **Method**: GET, POST, PUT, DELETE, etc.
- **Path**: API endpoint path
- **Description**: What the operation does

#### Environment
- Select execution environment
- Override variables if needed

#### Dataset
- Link test data datasets
- Configure data selection strategy

#### Assertions
- Add validation rules
- Use reusable assertions
- Configure expected outcomes

#### Runtime Variables
- Define dynamic values
- Map to request/response fields
- Set extraction paths

### AI-Powered Test Design

Use AI to generate test designs:

1. Click **Generate Designs with AI**
2. Select AI provider
3. Preview generated designs
4. Approve or regenerate

### Reusable Assertions

Create assertion library:

1. **Navigate to Assertion Library**
2. **Create Assertion**
   - Name and description
   - Type (Status, Body, Header, Schema, Custom)
   - Expression/rule
   - Expected value
3. **Attach to Test Designs**
   - Open test design
   - Click **Attach Assertion**
   - Select from library
   - Configure parameters

---

## Test Execution

### Execution Profiles

Create execution profiles for different scenarios:

#### Profile Configuration

1. **Navigate to Execution** → **Manage Profiles**
2. **Create Profile**
   - Name and description
   - Failure mode: Stop on first failure or continue
   - Timeout: Maximum execution time (ms)
   - Retry policy: Number of retries and delay
   - Assertion mode: Strict or lenient
   - Dataset strategy: Sequential, random, conditional
   - Parallelism: Concurrent execution settings
   - Runtime variable reset policy

### Starting an Execution

1. **Navigate to Execution**
2. **Select Execution Profile** from dropdown
3. **Click Start Execution**
4. Monitor progress in real-time

### Execution Monitoring

Monitor executions through:

- **Summary Cards**: Total, passed, failed, running, pending counts
- **Execution List**: All executions with status indicators
- **Real-time Updates**: Live status updates via polling

### Execution Details

Click on an execution to view:

#### Details Tab
- Execution ID and status
- Execution plan and requirement
- Start time and duration
- Step summary (total, passed, failed, skipped)

#### Validation Tab
- Validation statistics
- Generated assertions results
- Reusable assertions status
- Step-by-step validation details

#### Test Data Tab
- Resolved test data for each step
- Dataset and row information
- Variable sources and values

---

## Test Data Management

### Creating Datasets

1. **Navigate to Test Data** → **Datasets**
2. **Click Create Dataset**
3. **Upload Data**
   - Supported formats: CSV, JSON, Excel
   - Maximum file size: 10MB
   - Encoding: UTF-8

4. **Map Columns**
   - Map dataset columns to variables
   - Set data types
   - Configure transformations

5. **Save Dataset**

### Data Selection Strategies

#### Sequential
- Use rows in order
- Reset after last row
- Good for: Ordered test scenarios

#### Random
- Random row selection
- Optional seed for reproducibility
- Good for: Load testing, exploratory testing

#### Conditional
- Filter based on conditions
- Dynamic row selection
- Good for: Complex scenarios

### Data Profiles

Configure how data is consumed:

- **Per Test**: Reset data for each test case
- **Per Suite**: Share data across test suite
- **Never**: Maintain state throughout execution

---

## Assertions & Validation

### Assertion Types

#### Status Assertions
Validate HTTP status codes:
- Expected status: 200, 201, 400, 401, 404, 500, etc.
- Multiple status support

#### Body Assertions
Validate JSON response fields:
- Path-based validation: `$.user.id`
- Type validation: string, number, boolean
- Value validation: exact match, contains, regex

#### Header Assertions
Validate response headers:
- Header existence
- Header value matching
- Multiple headers

#### Schema Assertions
Validate against JSON schema:
- Upload JSON schema
- Validate response structure
- Type checking

#### Custom Assertions
Write custom validation logic:
- JavaScript expressions
- Access to response object
- Custom error messages

### Assertion Configuration

For each assertion:
- **Name**: Descriptive name
- **Type**: Assertion type
- **Path**: JSON path or header name
- **Operator**: Equals, contains, matches, etc.
- **Expected Value**: Expected result
- **Error Message**: Custom failure message

### Validation Results

View validation results:
- **Passed**: Green checkmark
- **Failed**: Red X with error details
- **Warning**: Yellow warning for soft failures
- **Duration**: Time taken for validation

---

## Reporting & Analytics

### Report Types

#### Execution Report
- Execution summary
- Test case results
- Pass/fail statistics
- Failure analysis

#### Trend Report
- Historical performance
- Pass/fail trends
- Flaky test identification
- Performance metrics

#### Coverage Report
- Requirements coverage
- API coverage
- Test case coverage
- Gap analysis

### Generating Reports

1. **Navigate to Reports**
2. **Select Report Type**
3. **Choose Scope**
   - Specific execution
   - Date range
   - Project
4. **Generate Report**
5. **Export**: PDF, Excel, HTML

### Report Analysis

Analyze reports for:
- **Failure Patterns**: Common failure causes
- **Flaky Tests**: Tests with inconsistent results
- **Performance Trends**: Response time trends
- **Coverage Gaps**: Untested scenarios

---

## CI/CD Integration

### Webhooks

Configure webhooks for CI/CD:

1. **Navigate to Settings** → **Webhooks**
2. **Add Webhook**
   - URL: CI/CD endpoint
   - Events: Execution completed, failed, etc.
   - Headers: Authentication headers
3. **Test Webhook**
4. **Save Configuration**

### Triggering Executions via API

```bash
curl -X POST https://testforge.example.com/api/executions/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "project-123",
    "executionPlanId": "plan-456",
    "executionProfileId": "profile-789"
  }'
```

### Pipeline Integration

Integrate with CI/CD pipelines:

#### GitHub Actions
```yaml
- name: Run API Tests
  run: |
    curl -X POST $TESTFORGE_URL/api/executions/start \
      -H "Authorization: Bearer $TESTFORGE_TOKEN" \
      -d '{"projectId":"$PROJECT_ID","executionPlanId":"$PLAN_ID"}'
```

#### Jenkins
```groovy
stage('API Tests') {
  steps {
    sh '''
      curl -X POST $TESTFORGE_URL/api/executions/start \
        -H "Authorization: Bearer $TESTFORGE_TOKEN" \
        -d "{\\"projectId\\":\\"$PROJECT_ID\\",\\"executionPlanId\\":\\"$PLAN_ID\\"}"
    '''
  }
}
```

---

## Best Practices

### Test Planning
- Start with clear requirements
- Use AI to generate initial strategies
- Review and refine strategies
- Prioritize based on risk

### Test Design
- Keep test designs focused and simple
- Use reusable assertions for common validations
- Document test data requirements
- Consider edge cases and error scenarios

### Test Data
- Organize datasets by environment
- Use realistic test data
- Avoid hardcoding values
- Version control test data

### Execution
- Use appropriate execution profiles
- Monitor executions in real-time
- Review failures promptly
- Archive old executions

### Maintenance
- Regularly review and update tests
- Remove obsolete tests
- Update assertions as APIs evolve
- Keep test data current

### Collaboration
- Use notifications to keep team informed
- Review each other's test designs
- Share execution reports
- Document test decisions

---

## QA Metrics

### Key Performance Indicators

Track these metrics:

#### Test Coverage
- Requirements coverage: % of requirements with tests
- API coverage: % of APIs tested
- Scenario coverage: % of scenarios covered

#### Test Execution
- Pass rate: % of tests passing
- Execution time: Average execution duration
- Flakiness: % of inconsistent test results
- Failure rate: % of tests failing

#### Test Quality
- Assertion effectiveness: % of meaningful assertions
- Test maintainability: Code complexity
- Documentation: % of tests documented

#### Defect Detection
- Defects found: Number of bugs detected
- Defect severity: Critical, major, minor distribution
- Escape rate: Defects missed in testing

### Dashboards

Create dashboards to monitor:
- Daily/weekly test execution trends
- Pass/fail rates over time
- Flaky test identification
- Team performance metrics

---

## Troubleshooting

### Common Issues

#### Tests Failing Intermittently
- Check for flaky tests
- Review test data consistency
- Verify environment stability
- Check for timing issues

#### Slow Test Execution
- Optimize test data loading
- Reduce unnecessary assertions
- Use parallel execution
- Profile slow tests

#### AI Generation Not Working
- Verify AI provider configuration
- Check API credentials
- Review rate limits
- Validate prompt templates

---

## Getting Help

- **Documentation**: Refer to other guides
- **FAQ**: Check [FAQ.md](FAQ.md)
- **Troubleshooting**: See [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)
- **Support**: Contact system administrator

---

**Happy Testing!**