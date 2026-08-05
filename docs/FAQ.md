# TestForge Frequently Asked Questions

**Version:** 1.0.0  
**Last Updated:** 2025-08-05

---

## Table of Contents

1. [General Questions](#general-questions)
2. [Installation & Setup](#installation--setup)
3. [Authentication & Users](#authentication--users)
4. [Projects & Environments](#projects--environments)
5. [Test Data](#test-data)
6. [Requirements & Test Design](#requirements--test-design)
7. [Execution](#execution)
8. [AI Features](#ai-features)
9. [Performance](#performance)
10. [Security](#security)
11. [Integration](#integration)
12. [Pricing & Licensing](#pricing--licensing)

---

## General Questions

### What is TestForge?

TestForge is an intelligent test automation platform designed for API testing. It combines AI-powered test generation with robust execution capabilities to help teams design, execute, and maintain API tests efficiently.

### What are the system requirements?

**Minimum:**
- CPU: 4 cores (2.0 GHz+)
- RAM: 8 GB
- Storage: 50 GB SSD
- OS: Linux (Ubuntu 20.04+), Windows Server 2019+, macOS 11.0+

**Recommended:**
- CPU: 8+ cores (2.5 GHz+)
- RAM: 16 GB
- Storage: 100 GB+ NVMe SSD
- OS: Ubuntu 22.04 LTS or RHEL 8+

### Is TestForge free?

TestForge is open-source and free to use. You can deploy it on your own infrastructure at no cost. Commercial support and enterprise features are available separately.

### What browsers are supported?

TestForge supports all modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Can I use TestForge in the cloud?

Yes! TestForge can be deployed on any cloud platform:
- AWS (EC2, ECS, EKS)
- Azure (VMs, AKS)
- Google Cloud (GCE, GKE)
- DigitalOcean, Linode, etc.

---

## Installation & Setup

### How long does installation take?

**Docker installation:** 10-15 minutes
**Manual installation:** 30-45 minutes

### Can I install TestForge on Windows?

Yes, TestForge supports Windows Server 2019 and later. However, Linux (Ubuntu/RHEL) is recommended for production deployments.

### Do I need programming knowledge to use TestForge?

No! TestForge is designed to be user-friendly with a visual interface. Basic computer skills are sufficient for most features. Programming knowledge is helpful for advanced customizations.

### Can I run TestForge on a single server?

Yes, TestForge can run on a single server for small teams or testing purposes. For production, we recommend a distributed setup with separate database and cache servers.

### What happens during installation?

1. Clone repository
2. Configure environment variables
3. Set up database (PostgreSQL)
4. Set up cache (Redis)
5. Install dependencies
6. Run database migrations
7. Start application

See [Installation Guide](INSTALLATION_GUIDE.md) for details.

---

## Authentication & Users

### How do I reset my password?

1. Click **Forgot Password** on login page
2. Enter your email address
3. Check email for reset link
4. Follow instructions to set new password

If you don't receive the email, check spam folder or contact your administrator.

### What user roles are available?

- **Admin**: Full system access
- **Project Manager**: Create and manage projects
- **QA Engineer**: Create and execute tests
- **Viewer**: Read-only access

### Can I integrate with SSO?

Yes, TestForge supports:
- SAML 2.0
- OAuth 2.0
- OpenID Connect
- LDAP/Active Directory

Contact your administrator to configure SSO.

### How do I create API tokens?

1. Navigate to **Settings** → **API Tokens**
2. Click **Create Token**
3. Enter token name and expiration
4. Copy token (shown only once)
5. Use token in API requests

**Important**: Store tokens securely. They cannot be retrieved after creation.

### Can I use two-factor authentication (2FA)?

Yes! Enable 2FA in your profile settings:
1. Navigate to **Settings** → **Security**
2. Click **Enable Two-Factor Authentication**
3. Scan QR code with authenticator app
4. Enter verification code
5. Save backup codes

---

## Projects & Environments

### How many projects can I create?

TestForge has no hard limit on projects. Performance depends on your hardware. Typical deployments support 100-500 projects per instance.

### What is an environment?

An environment represents a deployment target (development, staging, production, etc.). It includes:
- Base URL
- Authentication configuration
- Environment variables
- Timeout settings

### Can I import environments?

Yes! You can import environments from:
- JSON files
- YAML files
- Postman collections
- OpenAPI specifications

### How do I share environments across projects?

Currently, environments are project-specific. To reuse environments:
1. Export environment from source project
2. Import into target project
3. Or use the same environment configuration

### Can I clone a project?

Yes, you can duplicate projects:
1. Navigate to project settings
2. Click **Export Project**
3. Import with **Create Copy** mode

---

## Test Data

### What file formats are supported?

TestForge supports:
- **CSV**: Comma-separated values
- **JSON**: JavaScript Object Notation
- **Excel**: .xlsx, .xls
- **YAML**: YAML files
- **XML**: XML files

### What is the maximum file size?

Default: 10 MB per file  
Configurable via `MAX_FILE_SIZE` environment variable

### How do I handle large datasets?

For large datasets (100K+ rows):
1. Split into multiple files
2. Use data profiles with random selection
3. Implement pagination in test designs
4. Consider database-backed data sources

### Can I use database as test data source?

Currently, file-based datasets are supported. Database-backed test data is planned for a future release.

### How do I map dataset columns to variables?

1. Upload dataset
2. Click **Map Columns**
3. Select column
4. Enter variable name
5. Set data type
6. Save mapping

### What data selection strategies are available?

- **Sequential**: Use rows in order
- **Random**: Random selection
- **Conditional**: Filter-based selection

---

## Requirements & Test Design

### What is a requirement?

A requirement defines what needs to be tested. It includes:
- Title and description
- Category and priority
- Acceptance criteria
- Approval status

### Can I generate requirements automatically?

Yes! TestForge can generate requirements from:
- Project analysis (OpenAPI imports)
- AI providers (OpenAI, Azure, etc.)
- Manual entry

### What is a test design?

A test design specifies how to test a requirement. It includes:
- API operation to test
- Environment configuration
- Test data binding
- Assertions
- Runtime variables

### How do I attach assertions to test designs?

1. Open test design
2. Click **Attach Assertion**
3. Select from assertion library
4. Configure parameters
5. Save design

### Can I reuse test designs across requirements?

Currently, test designs are requirement-specific. You can:
1. Duplicate test designs
2. Copy assertion configurations
3. Use reusable assertions

---

## Execution

### How do I start an execution?

1. Navigate to **Execution** page
2. Select an execution profile
3. Click **Start Execution**
4. Monitor progress

### What is an execution profile?

An execution profile defines execution behavior:
- Failure mode (stop/continue)
- Timeout settings
- Retry policy
- Assertion mode
- Dataset strategy
- Parallelism settings

### How long does execution take?

Execution time depends on:
- Number of test steps
- API response times
- Dataset size
- Parallelism settings

Typical executions: 5-30 minutes  
Large test suites: 1-2 hours

### Can I schedule executions?

Yes! Use the Schedules module:
1. Navigate to **Schedules**
2. Click **Create Schedule**
3. Configure cron expression
4. Select test suite and profile
5. Enable schedule

### What happens if an execution fails?

- Failure is logged
- Notifications are sent (if configured)
- Report is generated
- Execution is marked as failed
- Next steps depend on failure mode

---

## AI Features

### Which AI providers are supported?

TestForge supports:
- OpenAI (GPT-4, GPT-3.5)
- Azure OpenAI
- Anthropic (Claude 3)
- Custom OpenAI-compatible APIs

### How do I configure an AI provider?

1. Navigate to **AI Providers**
2. Click **Add Provider**
3. Enter provider details:
   - Name
   - Provider type
   - API key
   - Model
4. Save provider

### What can AI generate?

AI can generate:
- Requirements from project analysis
- Test strategies
- Test designs
- Assertions
- Execution plans

### How accurate is AI-generated content?

AI-generated content requires human review. Typical accuracy:
- Requirements: 80-90%
- Test strategies: 75-85%
- Test designs: 70-80%

Always review and refine AI-generated content.

### Does AI generation cost money?

AI providers charge per token. Typical costs:
- GPT-4: $0.03-0.06 per 1K tokens
- GPT-3.5: $0.001-0.002 per 1K tokens
- Claude 3: Similar to GPT-4

Monitor usage via provider dashboards.

---

## Performance

### Why is the application slow?

Common causes:
- Large datasets without pagination
- Missing database indexes
- Insufficient server resources
- Network latency
- Browser cache issues

See [Troubleshooting Guide](TROUBLESHOOTING_GUIDE.md) for solutions.

### How can I improve performance?

1. **Database**: Add indexes, run VACUUM
2. **Caching**: Enable Redis, use React Query
3. **Resources**: Increase RAM/CPU
4. **Network**: Use CDN, enable compression
5. **Code**: Optimize queries, reduce bundle size

### What is the recommended server size?

**Small team (1-5 users):**
- 4 cores, 8 GB RAM, 50 GB SSD

**Medium team (5-20 users):**
- 8 cores, 16 GB RAM, 100 GB SSD

**Large team (20+ users):**
- 16+ cores, 32 GB RAM, 200 GB SSD

### How many concurrent executions can I run?

Depends on resources:
- CPU-bound: 2-4 concurrent per core
- I/O-bound: 10-20 concurrent
- Memory: 1-2 GB per execution

Monitor resource usage and adjust accordingly.

---

## Security

### Is my data secure?

Yes! TestForge implements:
- JWT authentication
- Role-based access control
- Encryption at rest
- HTTPS/TLS support
- Input validation
- SQL injection prevention
- XSS protection

### How do I enable HTTPS?

1. Obtain SSL certificate
2. Configure Nginx/reverse proxy
3. Update CORS settings
4. Enable HSTS

See [Administrator Guide](ADMINISTRATOR_GUIDE.md) for details.

### Can I run TestForge offline?

Yes! TestForge can run completely offline:
- No external API calls required
- AI features can be disabled
- All data stored locally

### How do I backup my data?

1. Navigate to **Backup & Restore**
2. Click **Create Backup**
3. Download backup file
4. Store securely

Schedule automated backups for production.

### What happens to my data if I cancel?

You own your data. Cancel anytime:
1. Export all data via backup
2. Delete application
3. Data is permanently removed from servers

---

## Integration

### Can I integrate with CI/CD tools?

Yes! TestForge supports:
- **Webhooks**: HTTP callbacks for events
- **REST API**: Full API access
- **CLI**: Command-line interface
- **SDKs**: JavaScript, Python, Java

### How do I trigger executions from CI/CD?

```bash
# Using API
curl -X POST https://testforge.example.com/api/executions/start \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"projectId":"proj-123","executionPlanId":"plan-456"}'
```

See [QA Guide](QA_GUIDE.md) for CI/CD integration examples.

### Can I import from other tools?

Currently supported imports:
- **OpenAPI/Swagger**: Import APIs
- **Postman**: Import collections
- **JSON/YAML**: Import environments

More import options coming soon.

### Does TestForge integrate with Jira?

Jira integration is planned for a future release. Currently, you can:
- Export test results
- Use webhooks to trigger Jira workflows
- Write custom integrations via API

### Can I export test results?

Yes! Export formats:
- PDF reports
- Excel spreadsheets
- HTML reports
- JSON data

---

## Pricing & Licensing

### Is TestForge open-source?

Yes! TestForge is released under the MIT License. You can:
- Use for personal/commercial projects
- Modify source code
- Distribute copies
- Contribute back to the project

### What is the license?

MIT License - see [LICENSE](https://github.com/vaibhavs1997/TestForge/blob/main/LICENSE) file.

### Is commercial support available?

Yes! Commercial support includes:
- Priority email support
- Phone support
- Custom integrations
- Training and onboarding
- SLA guarantees

Contact: sales@testforge.io

### How much does the enterprise version cost?

Enterprise pricing is customized based on:
- Number of users
- Deployment size
- Support level
- Custom features

Contact sales@testforge.io for pricing.

---

## Getting Help

### Where can I find documentation?

- [User Guide](USER_GUIDE.md)
- [QA Guide](QA_GUIDE.md)
- [Administrator Guide](ADMINISTRATOR_GUIDE.md)
- [API Documentation](API_DOCUMENTATION.md)
- [Architecture Guide](ARCHITECTURE_GUIDE.md)
- [Installation Guide](INSTALLATION_GUIDE.md)
- [Troubleshooting Guide](TROUBLESHOOTING_GUIDE.md)

### How do I report bugs?

1. Check [Troubleshooting Guide](TROUBLESHOOTING_GUIDE.md)
2. Search [GitHub Issues](https://github.com/vaibhavs1997/TestForge/issues)
3. Create new issue with:
   - Description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details
   - Logs

### How do I request features?

Submit feature requests via [GitHub Issues](https://github.com/vaibhavs1997/TestForge/issues):
1. Check if feature already requested
2. Create new issue with "Feature Request" label
3. Describe use case and benefits
4. Community voting helps prioritize

### Is there a community forum?

Yes! Join the community:
- **Forum**: https://community.testforge.io
- **Discord**: https://discord.gg/testforge
- **Stack Overflow**: Tag `testforge`

### How do I contribute?

Contributions welcome!
1. Fork repository
2. Create feature branch
3. Make changes
4. Submit pull request
5. Code review and merge

See [CONTRIBUTING.md](https://github.com/vaibhavs1997/TestForge/blob/main/CONTRIBUTING.md) for guidelines.

---

**Still have questions?** Contact us at support@testforge.io