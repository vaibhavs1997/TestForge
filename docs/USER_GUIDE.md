# TestForge User Guide

**Version:** 1.0.0  
**Last Updated:** 2025-08-05  
**Audience:** End users, QA engineers, testers

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Projects](#projects)
4. [Environments](#environments)
5. [Test Data](#test-data)
6. [Requirements](#requirements)
7. [Test Designs](#test-designs)
8. [Execution](#execution)
9. [Reports](#reports)
10. [AI Features](#ai-features)
11. [Scheduling](#scheduling)
12. [Notifications](#notifications)
13. [Versioning](#versioning)
14. [Audit Log](#audit-log)
15. [Backup & Restore](#backup--restore)

---

## Introduction

TestForge is an intelligent test automation platform that helps teams design, execute, and maintain API tests efficiently. It combines AI-powered test generation with robust execution capabilities to streamline your testing workflow.

### Key Features

- **AI-Powered Test Generation**: Generate requirements, test strategies, designs, and assertions using AI
- **Visual Test Designer**: Design tests using an intuitive interface
- **Execution Engine**: Run tests with comprehensive reporting
- **Scheduling**: Automate test execution on a recurring basis
- **Notifications**: Get alerts on test execution status
- **Versioning**: Track changes and maintain test history
- **Audit Trail**: Complete audit log for compliance

---

## Getting Started

### Accessing TestForge

1. Open your web browser and navigate to your TestForge instance URL
2. Log in with your credentials
3. You'll be redirected to the Dashboard

### Dashboard Overview

The Dashboard provides:
- Project overview and statistics
- Recent execution results
- Quick access to key features
- Navigation to all modules

---

## Projects

### Creating a Project

1. Click **Projects** in the sidebar
2. Click **Create Project**
3. Enter project details:
   - **Name**: Project name
   - **Description**: Optional description
4. Click **Create**

### Managing Projects

- **View Projects**: See all projects in the Projects list
- **Select Project**: Click on a project to open it
- **Project Settings**: Access project-specific configurations

### Project Context

Set project context to define:
- Base URL for APIs
- Authentication methods
- Default headers
- Environment variables

---

## Environments

Environments define where your tests will execute (development, staging, production, etc.).

### Creating an Environment

1. Navigate to **Environment** in the project sidebar
2. Click **Create Environment**
3. Fill in the details:
   - **Name**: Environment name (e.g., "Production")
   - **Base URL**: API base URL
   - **Description**: Optional description
   - **Authentication**: Select authentication type (None, API Key, Bearer, Basic)
   - **Variables**: Key-value pairs for environment variables
   - **Timeout**: Request timeout in milliseconds
4. Click **Create**

### Managing Environments

- **Edit**: Click the edit icon to modify environment details
- **Delete**: Click the delete icon to remove an environment
- **Import**: Import environments from JSON/YAML files
- **Search**: Use the search bar to find environments

### Environment Variables

Add variables to make your tests portable:
```
API_KEY=your-api-key
BASE_URL=https://api.example.com
TIMEOUT=5000
```

---

## Test Data

TestForge supports multiple test data sources for data-driven testing.

### Datasets

Create datasets to provide test data for your tests.

1. Navigate to **Test Data** → **Datasets**
2. Click **Create Dataset**
3. Upload data in CSV, JSON, or Excel format
4. Map columns to test variables
5. Save the dataset

### Data Profiles

Define how test data should be consumed:

1. Navigate to **Test Data** → **Profiles**
2. Click **Create Profile**
3. Configure:
   - **Selection Strategy**: Sequential, Random, or Conditional
   - **Reset Policy**: Per test, per suite, or never
   - **Dataset Binding**: Link to specific datasets
4. Save the profile

### Data Mappings

Map dataset columns to test variables:
- Define variable names
- Set data types
- Apply transformations if needed

---

## Requirements

Requirements define what needs to be tested. TestForge supports both manual and AI-generated requirements.

### Creating Requirements Manually

1. Navigate to **Requirements**
2. Click **Add Requirement**
3. Fill in:
   - **Title**: Requirement name
   - **Description**: Detailed description
   - **Category**: Functional, Performance, Security, etc.
   - **Priority**: High, Medium, Low
4. Click **Create**

### Generating Requirements with AI

1. Click **Generate with AI**
2. Select an AI provider
3. Preview the generated requirements
4. Click **Generate** to create requirements

### Managing Requirements

- **Review**: Click the eye icon to review a requirement
- **Approve**: Approve suggested requirements
- **Reject**: Reject requirements that don't meet criteria
- **Archive**: Archive old requirements
- **Delete**: Remove requirements permanently

### Requirement Status Flow

```
Suggested → Approved → Archived
    ↓         ↓
  Rejected ──┘
```

---

## Test Designs

Test designs define how to test a requirement.

### Creating Test Designs

1. Open a requirement for review
2. Go to the **Test Design** tab
3. Click **Generate Test Designs** or create manually
4. Configure:
   - **Operation**: Select API operation to test
   - **Environment**: Choose execution environment
   - **Dataset**: Link test data
   - **Assertions**: Add validation rules
   - **Runtime Variables**: Define dynamic values
5. Save the design

### Assertions

Add assertions to validate test outcomes:

- **Status Assertions**: Validate HTTP status codes
- **Body Assertions**: Validate JSON response fields
- **Header Assertions**: Validate response headers
- **Schema Assertions**: Validate against JSON schema
- **Custom Assertions**: Write custom validation logic

### Reusable Assertions

Create assertion libraries for reuse across tests:
1. Navigate to **Assertion Library**
2. Click **Create Assertion**
3. Define assertion logic
4. Attach to test designs as needed

---

## Execution

Execute your test suites and view results.

### Starting an Execution

1. Navigate to **Execution**
2. Select an execution profile
3. Click **Start Execution**
4. Monitor progress in real-time

### Execution Profiles

Configure execution behavior:
- **Failure Mode**: Stop on first failure or continue
- **Timeout**: Maximum execution time
- **Retry Policy**: Automatic retry configuration
- **Assertion Mode**: Strict or lenient validation
- **Parallelism**: Concurrent execution settings

### Viewing Results

The Execution page shows:
- **Summary Cards**: Total, passed, failed, running, pending
- **Execution List**: All executions with status
- **Details Panel**: Selected execution details
  - Timeline of steps
  - Validation results
  - Resolved test data
  - Generated assertions

### Execution Details

Click on an execution to view:
- **Details Tab**: Basic information and summary
- **Validation Tab**: Assertion results
- **Test Data Tab**: Resolved test data values

---

## Reports

Generate and view test execution reports.

### Generating Reports

1. Navigate to **Reports**
2. Select a report template
3. Choose execution scope
4. Click **Generate Report**
5. Download or share the report

### Report Contents

Reports include:
- Executive summary
- Test execution statistics
- Pass/fail breakdown
- Detailed failure analysis
- Performance metrics
- Trend analysis

---

## AI Features

TestForge leverages AI to accelerate test creation.

### AI Providers

Configure AI providers for test generation:
1. Navigate to **AI Providers**
2. Click **Add Provider**
3. Select provider type (OpenAI, Azure OpenAI, etc.)
4. Enter API credentials
5. Configure model settings
6. Save the provider

### AI-Powered Generation

Use AI to generate:
- **Requirements**: From project analysis
- **Test Strategies**: Based on requirements
- **Test Designs**: From strategies
- **Assertions**: Based on test designs
- **Execution Plans**: From test designs

### Using AI Generation

1. Open the relevant module (e.g., Requirements)
2. Click **Generate with AI**
3. Select AI provider
4. Preview the generated content
5. Approve or regenerate as needed

---

## Scheduling

Automate test execution with schedules.

### Creating a Schedule

1. Navigate to **Schedules**
2. Click **Create Schedule**
3. Configure:
   - **Name**: Schedule name
   - **Description**: Optional description
   - **Test Suite**: Select suite to execute
   - **Execution Profile**: Choose profile
   - **Environment**: Override environment (optional)
   - **Cron Expression**: Schedule timing
   - **Timezone**: Select timezone
   - **Enabled**: Toggle schedule on/off
4. Click **Create**

### Cron Expressions

Common cron patterns:
- `0 9 * * *` - Every day at 9 AM
- `0 9 * * 1` - Every Monday at 9 AM
- `*/5 * * * *` - Every 5 minutes
- `0 0 * * 0` - Every Sunday at midnight

### Managing Schedules

- **Edit**: Modify schedule settings
- **Duplicate**: Create a copy of a schedule
- **Enable/Disable**: Toggle schedule active status
- **Run Now**: Execute schedule immediately
- **Delete**: Remove schedule

---

## Notifications

Configure notifications for test events.

### Creating a Notification

1. Navigate to **Notifications**
2. Click **Create Notification**
3. Configure:
   - **Name**: Notification name
   - **Event Type**: Select trigger event
   - **Provider**: Choose notification provider
   - **Recipients**: Add email addresses or users
   - **Subject Template**: Customize subject line
   - **Body Template**: Customize message body
   - **Enabled**: Toggle notification on/off
4. Click **Create**

### Event Types

- Execution Completed
- Execution Failed
- Schedule Completed
- Schedule Failed
- Report Generated

### Testing Notifications

Click the **Test** button to send a test notification and verify configuration.

---

## Versioning

Track changes to your test assets over time.

### Viewing Version History

1. Navigate to **Version History**
2. Select an asset type (Requirement, Test Design, etc.)
3. Browse version history
4. Compare versions
5. Restore previous versions if needed

### Version Information

Each version includes:
- Timestamp
- Author
- Change description
- Full asset snapshot

---

## Audit Log

Complete audit trail for compliance and tracking.

### Viewing Audit Logs

1. Navigate to **Audit Log**
2. Filter by:
   - Date range
   - User
   - Action type
   - Resource type
3. View detailed log entries

### Audit Information

Each log entry includes:
- Timestamp
- User who performed action
- Action type (Create, Update, Delete, Execute)
- Resource type and ID
- Before/after values (for updates)
- IP address

---

## Backup & Restore

Protect your data with backups.

### Creating a Backup

1. Navigate to **Backup & Restore**
2. Click **Create Backup**
3. Wait for backup to complete
4. Download backup file if needed

### Exporting Projects

1. Click **Export Project**
2. Choose export format
3. Download the exported file

### Importing Projects

1. Click **Import Project**
2. Select import file
3. Choose import mode:
   - **Create Copy**: Import as new project
   - **Replace Existing**: Overwrite existing project
   - **Merge**: Merge with existing project
4. Click **Import**

### Restoring from Backup

1. Select a backup from the list
2. Click **Restore**
3. Confirm the restore action
4. Wait for restore to complete

**Warning**: Restoring will replace all current data.

---

## Tips and Best Practices

### Test Design
- Start with clear, testable requirements
- Use AI to generate initial drafts
- Review and refine AI-generated content
- Attach reusable assertions for consistency

### Execution
- Use appropriate execution profiles for different scenarios
- Monitor executions in real-time
- Review failed executions promptly
- Export reports for stakeholder communication

### Data Management
- Organize datasets by environment
- Use meaningful variable names
- Version control your test data
- Clean up unused datasets regularly

### Collaboration
- Use notifications to keep team informed
- Review each other's test designs
- Leverage audit logs for compliance
- Schedule regular test runs

---

## Keyboard Shortcuts

- **Ctrl/Cmd + N**: Create new item (context-dependent)
- **Ctrl/Cmd + F**: Search
- **Ctrl/Cmd + S**: Save (in editors)
- **Esc**: Close modals/dialogs

---

## Getting Help

- **Documentation**: Refer to this guide and other documentation
- **FAQ**: Check [FAQ.md](FAQ.md) for common questions
- **Troubleshooting**: See [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)
- **Support**: Contact your system administrator

---

**Happy Testing!**