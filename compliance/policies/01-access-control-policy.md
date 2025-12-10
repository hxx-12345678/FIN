# Access Control Policy

**Policy ID:** ACC-001  
**Version:** 1.0  
**Effective Date:** 2024-12-08  
**Framework:** SOC2 Type II, ISO 27001  
**Owner:** Security Team

## 1. Purpose

This policy establishes requirements for access control to FinaPilot systems, applications, and data to ensure confidentiality, integrity, and availability in accordance with SOC2 Trust Service Criteria (TSC) CC2.1, CC2.2, and CC2.3.

## 2. Scope

This policy applies to:
- All FinaPilot employees, contractors, and third-party vendors
- All systems, applications, databases, and network resources
- All data classified as Confidential, Internal, or Public

## 3. Principles

### 3.1 Least Privilege
- Users shall be granted minimum access necessary to perform job functions
- Access rights shall be reviewed quarterly
- Unused access shall be revoked within 30 days

### 3.2 Role-Based Access Control (RBAC)
- Access shall be granted based on organizational roles:
  - **Admin**: Full system access, user management, configuration
  - **Finance**: Financial data access, model creation, exports
  - **Viewer**: Read-only access to assigned data
- Role assignments require approval from data owner or manager

### 3.3 Multi-Factor Authentication (MFA)
- MFA required for all administrative accounts
- MFA required for all users accessing financial data
- MFA methods: TOTP, SMS, or hardware tokens

### 3.4 Account Management
- User accounts created only after:
  - Written authorization from manager
  - Completion of security training
  - Signed confidentiality agreement
- Accounts disabled within 24 hours of termination
- Inactive accounts (90+ days) automatically disabled

## 4. Access Control Requirements

### 4.1 Authentication
- Strong passwords: minimum 12 characters, complexity requirements
- Password expiration: 90 days
- Password history: last 12 passwords cannot be reused
- Account lockout: 5 failed attempts, 30-minute lockout

### 4.2 Authorization
- Access granted based on:
  - User role (RBAC)
  - Organization membership
  - Data classification level
  - Business justification
- Access reviews conducted quarterly
- Access logs reviewed monthly

### 4.3 Session Management
- Session timeout: 30 minutes of inactivity
- Concurrent session limit: 3 per user
- Secure session tokens: JWT with 7-day expiration
- Session invalidation on logout

### 4.4 Network Access
- VPN required for remote access
- Firewall rules: deny by default, allow by exception
- Network segmentation: production, staging, development
- Intrusion detection: 24/7 monitoring

## 5. Access Review Process

1. **Quarterly Reviews**
   - HR provides list of active employees
   - System administrators review access rights
   - Managers approve/revoke access
   - Documentation maintained for 7 years

2. **Termination Process**
   - HR notifies IT within 1 hour
   - All access revoked within 24 hours
   - Data access logs reviewed
   - Exit interview conducted

## 6. Exception Handling

- Emergency access requires:
  - Manager approval
  - Security team notification
  - Audit log entry
  - Review within 48 hours

## 7. Compliance

- SOC2 Type II: CC2.1, CC2.2, CC2.3
- ISO 27001: A.9.1, A.9.2, A.9.3, A.9.4
- GDPR: Article 32 (Security of processing)

## 8. Enforcement

Violations of this policy may result in:
- Immediate access revocation
- Disciplinary action
- Legal action if applicable

## 9. Review and Updates

This policy shall be reviewed annually or when:
- Regulatory requirements change
- Security incidents occur
- System architecture changes

**Approved by:** CTO, Security Officer  
**Last Reviewed:** 2024-12-08  
**Next Review:** 2025-12-08


