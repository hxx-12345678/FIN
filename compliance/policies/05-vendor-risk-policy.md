# Vendor Risk Management Policy

**Policy ID:** VEN-001  
**Version:** 1.0  
**Effective Date:** 2024-12-08  
**Framework:** SOC2 Type II, ISO 27001  
**Owner:** Procurement & Security Teams

## 1. Purpose

This policy establishes requirements for assessing, managing, and monitoring third-party vendor risks to ensure security, compliance, and business continuity in accordance with SOC2 TSC CC1.3 and CC3.1.

## 2. Scope

Applies to all third-party vendors, suppliers, and service providers that:
- Access FinaPilot systems or data
- Process customer data
- Provide critical business services
- Handle financial transactions
- Store or transmit sensitive data

## 3. Vendor Classification

### 3.1 Critical Vendors
- **Criteria:** Access to production data, critical business functions
- **Assessment:** Annual security assessment, SOC2 Type II required
- **Monitoring:** Quarterly reviews, continuous monitoring
- **Example:** Cloud providers, payment processors, data analytics

### 3.2 High-Risk Vendors
- **Criteria:** Access to internal systems, customer data
- **Assessment:** Annual security questionnaire, SOC2 Type I minimum
- **Monitoring:** Semi-annual reviews
- **Example:** CRM providers, email services, development tools

### 3.3 Standard Vendors
- **Criteria:** Limited access, non-sensitive data
- **Assessment:** Security questionnaire, basic security checks
- **Monitoring:** Annual reviews
- **Example:** Office supplies, non-critical software

### 3.4 Low-Risk Vendors
- **Criteria:** No system access, no sensitive data
- **Assessment:** Basic business checks
- **Monitoring:** As needed
- **Example:** Utilities, general services

## 4. Vendor Assessment Process

### 4.1 Pre-Engagement
1. **Business Justification:** Document business need
2. **Risk Assessment:** Classify vendor risk level
3. **Security Questionnaire:** Vendor completes security assessment
4. **Due Diligence:** Review vendor security posture
5. **Contract Review:** Legal and security terms

### 4.2 Security Requirements
- **SOC2 Type II:** Required for Critical vendors
- **ISO 27001:** Preferred for Critical vendors
- **GDPR Compliance:** Required if processing EU data
- **Penetration Testing:** Annual for Critical vendors
- **Insurance:** Cyber liability insurance minimum $5M

### 4.3 Contract Requirements
- **Data Processing Agreement (DPA):** Required for data processors
- **Security Addendum:** Security requirements and SLAs
- **Right to Audit:** Annual audit rights
- **Breach Notification:** 24-hour notification requirement
- **Data Return/Deletion:** Upon contract termination

### 4.4 Ongoing Monitoring
- **Quarterly Reviews:** Critical vendors
- **Annual Assessments:** All vendors
- **Security Incidents:** Immediate review
- **Compliance Changes:** Re-assessment if regulations change

## 5. Vendor Risk Assessment Criteria

### 5.1 Security Posture
- Security certifications (SOC2, ISO 27001)
- Security incident history
- Penetration testing results
- Vulnerability management program
- Security training for employees

### 5.2 Data Protection
- Encryption at rest and in transit
- Data residency and localization
- Data retention policies
- Access controls and authentication
- Backup and disaster recovery

### 5.3 Business Continuity
- Disaster recovery plan
- Business continuity plan
- Uptime SLAs (> 99.9%)
- Incident response procedures
- Financial stability

### 5.4 Compliance
- Regulatory compliance (GDPR, HIPAA, PCI)
- Industry certifications
- Privacy policies
- Terms of service
- Data processing agreements

## 6. Vendor Onboarding

1. **Request:** Business unit submits vendor request
2. **Assessment:** Security team conducts risk assessment
3. **Approval:** Management approves based on risk level
4. **Contract:** Legal negotiates contract with security terms
5. **Implementation:** Vendor integrated with security controls
6. **Documentation:** Vendor added to vendor registry

## 7. Vendor Offboarding

1. **Notification:** 30-day notice (or per contract)
2. **Data Return:** All data returned or deleted
3. **Access Revocation:** All system access removed
4. **Verification:** Confirm data deletion/return
5. **Documentation:** Update vendor registry

## 8. Vendor Registry

Maintain centralized registry with:
- Vendor name and contact information
- Risk classification
- Services provided
- Contract dates and renewal
- Security assessment dates
- Compliance status
- Incident history

## 9. Incident Management

- **Vendor Breach:** Immediate notification required
- **Assessment:** Evaluate impact on FinaPilot
- **Response:** Coordinate with vendor on remediation
- **Notification:** Notify affected customers if required
- **Documentation:** Document incident and response

## 10. Compliance

- SOC2 Type II: CC1.3 (Risk Assessment), CC3.1
- ISO 27001: A.15 (Supplier relationships)
- GDPR: Article 28 (Processor agreements)
- HIPAA: Business Associate Agreements

## 11. Metrics

- Vendor assessment completion rate: 100%
- Critical vendor SOC2 coverage: 100%
- Vendor incident rate: < 1 per year
- Contract compliance rate: > 95%

## 12. Exceptions

Exceptions require:
- Business justification
- Risk acceptance by management
- Compensating controls
- Documentation and approval

**Approved by:** CTO, Procurement Manager  
**Last Reviewed:** 2024-12-08  
**Next Review:** 2025-12-08


