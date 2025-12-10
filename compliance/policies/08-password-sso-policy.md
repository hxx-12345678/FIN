# Password & SSO Policy

**Policy ID:** PAS-001  
**Version:** 1.0  
**Effective Date:** 2024-12-08  
**Framework:** SOC2 Type II, ISO 27001, NIST  
**Owner:** Security Team

## 1. Purpose

This policy establishes requirements for password management and Single Sign-On (SSO) to ensure secure authentication and access control in accordance with SOC2 TSC CC2.1 and NIST SP 800-63B.

## 2. Scope

Applies to:
- All user accounts accessing FinaPilot systems
- All authentication mechanisms
- All password-based and SSO authentication
- All third-party SSO providers

## 3. Password Requirements

### 3.1 Password Complexity
- **Minimum Length:** 12 characters
- **Complexity:** Must include:
  - Uppercase letters (A-Z)
  - Lowercase letters (a-z)
  - Numbers (0-9)
  - Special characters (!@#$%^&*)
- **Prohibited:** Dictionary words, personal information, common patterns
- **Validation:** Real-time password strength meter

### 3.2 Password History
- **History:** Last 12 passwords cannot be reused
- **Enforcement:** System-enforced password history
- **Storage:** Hashed passwords only (bcrypt, Argon2)

### 3.3 Password Expiration
- **Standard Users:** 90 days
- **Administrative Users:** 60 days
- **Service Accounts:** 180 days (with approval)
- **Notification:** 14 days before expiration

### 3.4 Password Storage
- **Hashing:** bcrypt (cost factor 12) or Argon2
- **Salt:** Unique salt per password
- **Transmission:** Never transmitted in plaintext
- **Display:** Never displayed (masked input)

## 4. Account Security

### 4.1 Account Lockout
- **Failed Attempts:** 5 failed login attempts
- **Lockout Duration:** 30 minutes
- **Administrative Unlock:** Security team can unlock
- **Notification:** User notified of lockout

### 4.2 Password Reset
- **Self-Service:** Password reset via email
- **Security Questions:** Not used (security risk)
- **Email Verification:** Reset link sent to registered email
- **Link Expiration:** Reset link expires in 1 hour
- **One-Time Use:** Reset link used once only

### 4.3 Password Sharing
- **Prohibited:** Passwords must not be shared
- **Service Accounts:** Use application-specific credentials
- **Emergency Access:** Use break-glass procedures

## 5. Multi-Factor Authentication (MFA)

### 5.1 MFA Requirements
- **Administrative Accounts:** MFA required
- **Finance Users:** MFA required
- **Remote Access:** MFA required
- **Sensitive Data Access:** MFA required
- **All Users:** MFA recommended

### 5.2 MFA Methods
- **TOTP:** Time-based one-time password (Google Authenticator, Authy)
- **SMS:** SMS-based codes (backup method)
- **Hardware Tokens:** YubiKey, RSA SecurID
- **Biometric:** Fingerprint, face recognition (mobile apps)

### 5.3 MFA Enforcement
- **Enrollment:** Required within 30 days of account creation
- **Backup Codes:** Generate and store securely
- **Recovery:** Account recovery process for lost MFA device

## 6. Single Sign-On (SSO)

### 6.1 SSO Providers
- **Supported:** Google Workspace, Okta, Microsoft Azure AD
- **Protocol:** SAML 2.0, OAuth 2.0, OpenID Connect
- **Encryption:** TLS 1.3 for all SSO communications

### 6.2 SSO Requirements
- **MFA:** SSO provider must enforce MFA
- **Session Management:** SSO session timeout: 8 hours
- **Just-In-Time (JIT):** Automatic user provisioning
- **Attribute Mapping:** Email, name, groups

### 6.3 SSO Implementation
- **Configuration:** Security team configures SSO
- **Testing:** Tested in staging before production
- **Documentation:** SSO setup documented
- **Monitoring:** SSO authentication monitored

## 7. Session Management

### 7.1 Session Timeout
- **Inactivity:** 30 minutes of inactivity
- **Maximum Duration:** 8 hours (SSO), 24 hours (password)
- **Extension:** User can extend session
- **Warning:** 5 minutes before timeout

### 7.2 Concurrent Sessions
- **Limit:** 3 concurrent sessions per user
- **Enforcement:** System-enforced
- **Notification:** User notified of new login

### 7.3 Session Security
- **Tokens:** Secure, random session tokens
- **Storage:** HttpOnly, Secure, SameSite cookies
- **Transmission:** HTTPS only
- **Invalidation:** Immediate on logout

## 8. Password Managers

### 8.1 Approved Password Managers
- **Corporate:** 1Password Business, LastPass Enterprise
- **Personal:** 1Password, Bitwarden, LastPass
- **Prohibited:** Browser password managers for corporate accounts

### 8.2 Password Manager Requirements
- **Encryption:** End-to-end encryption
- **MFA:** MFA required for password manager
- **Backup:** Secure backup of password vault
- **Sharing:** Secure sharing for teams

## 9. Service Accounts

### 9.1 Service Account Requirements
- **Naming:** Descriptive name (e.g., `api-service-prod`)
- **Password:** 32+ character random password
- **Rotation:** Annual rotation minimum
- **Access:** Least privilege principle
- **Monitoring:** All access logged

### 9.2 Service Account Management
- **Inventory:** Maintain service account registry
- **Ownership:** Assign account owner
- **Review:** Quarterly review of service accounts
- **Disable:** Disable unused accounts

## 10. Compliance

- SOC2 Type II: CC2.1 (Logical Access Controls)
- ISO 27001: A.9.2 (User access management), A.9.4 (System and application access control)
- NIST SP 800-63B: Digital Identity Guidelines
- GDPR: Article 32 (Security of processing)

## 11. Training

- **New Hire:** Password and MFA training
- **Annual:** Security awareness training
- **Updates:** Training on policy changes
- **Phishing:** Regular phishing simulation

## 12. Monitoring and Enforcement

- **Failed Logins:** Monitor and alert on suspicious activity
- **Password Changes:** Log all password changes
- **MFA Enrollment:** Track MFA enrollment rate
- **Violations:** Disciplinary action for policy violations

**Approved by:** CTO, Security Officer  
**Last Reviewed:** 2024-12-08  
**Next Review:** 2025-12-08


