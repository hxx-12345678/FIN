/**
 * Compliance Service
 * Production-ready compliance and security management
 * Handles frameworks, security controls, audit logs, and policies
 */

import prisma from '../config/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import { auditService } from './audit.service';
import { logger } from '../utils/logger';

// Detailed requirements for each framework
export const FRAMEWORK_REQUIREMENTS: Record<string, Array<{ id: string; title: string; description: string; category: string }>> = {
  soc2: [
    { id: 'cc1.1', title: 'Control Environment', description: 'Establish and maintain a control environment that sets the tone for the organization', category: 'Control Environment' },
    { id: 'cc1.2', title: 'Communication and Information', description: 'Obtain and communicate information necessary for internal control', category: 'Control Environment' },
    { id: 'cc1.3', title: 'Risk Assessment', description: 'Identify and analyze risks to achievement of objectives', category: 'Risk Assessment' },
    { id: 'cc2.1', title: 'Logical Access Controls', description: 'Restrict logical access to information assets', category: 'Access Control' },
    { id: 'cc2.2', title: 'Physical Access Controls', description: 'Restrict physical access to facilities and equipment', category: 'Access Control' },
    { id: 'cc2.3', title: 'System Access Controls', description: 'Restrict access to systems and applications', category: 'Access Control' },
    { id: 'cc3.1', title: 'System Operations', description: 'Monitor system operations and respond to incidents', category: 'System Operations' },
    { id: 'cc3.2', title: 'Change Management', description: 'Implement change management processes', category: 'Change Management' },
    { id: 'cc4.1', title: 'Data Classification', description: 'Classify data based on sensitivity and criticality', category: 'Data Protection' },
    { id: 'cc4.2', title: 'Data Encryption', description: 'Encrypt sensitive data at rest and in transit', category: 'Data Protection' },
    { id: 'cc5.1', title: 'Security Monitoring', description: 'Monitor security events and respond to threats', category: 'Security Monitoring' },
    { id: 'cc5.2', title: 'Vulnerability Management', description: 'Identify and remediate security vulnerabilities', category: 'Vulnerability Management' },
    { id: 'cc6.1', title: 'Availability Controls', description: 'Ensure system availability and uptime', category: 'Availability' },
    { id: 'cc6.2', title: 'Backup and Recovery', description: 'Implement backup and disaster recovery procedures', category: 'Availability' },
    { id: 'cc7.1', title: 'Processing Integrity', description: 'Ensure data processing accuracy and completeness', category: 'Processing Integrity' },
    { id: 'cc7.2', title: 'Data Validation', description: 'Validate data inputs and outputs', category: 'Processing Integrity' },
    { id: 'cc8.1', title: 'Confidentiality Controls', description: 'Protect confidential information from unauthorized disclosure', category: 'Confidentiality' },
    { id: 'cc8.2', title: 'Data Retention', description: 'Establish data retention and disposal policies', category: 'Confidentiality' },
    { id: 'cc9.1', title: 'Privacy Notice', description: 'Provide clear privacy notices to data subjects', category: 'Privacy' },
    { id: 'cc9.2', title: 'Data Subject Rights', description: 'Enable data subject rights (access, rectification, erasure)', category: 'Privacy' },
    { id: 'cc9.3', title: 'Data Processing Consent', description: 'Obtain and manage consent for data processing', category: 'Privacy' },
    { id: 'cc9.4', title: 'Data Breach Notification', description: 'Notify authorities and data subjects of breaches', category: 'Privacy' },
    { id: 'cc9.5', title: 'Privacy by Design', description: 'Implement privacy controls in system design', category: 'Privacy' },
    { id: 'cc9.6', title: 'Data Minimization', description: 'Collect and process only necessary data', category: 'Privacy' },
    { id: 'cc9.7', title: 'Third-Party Privacy', description: 'Ensure third parties comply with privacy requirements', category: 'Privacy' },
    { id: 'cc9.8', title: 'Privacy Training', description: 'Train personnel on privacy requirements', category: 'Privacy' },
    { id: 'cc9.9', title: 'Privacy Monitoring', description: 'Monitor compliance with privacy policies', category: 'Privacy' },
    { id: 'cc9.10', title: 'Privacy Incident Response', description: 'Respond to privacy incidents and breaches', category: 'Privacy' },
    { id: 'cc9.11', title: 'Data Processing Records', description: 'Maintain records of data processing activities', category: 'Privacy' },
    { id: 'cc9.12', title: 'Data Protection Impact Assessment', description: 'Conduct DPIA for high-risk processing', category: 'Privacy' },
    { id: 'cc9.13', title: 'Data Transfer Safeguards', description: 'Implement safeguards for cross-border data transfers', category: 'Privacy' },
    { id: 'cc9.14', title: 'Privacy Audit', description: 'Conduct regular privacy audits', category: 'Privacy' },
    { id: 'cc9.15', title: 'Privacy Documentation', description: 'Maintain privacy policies and procedures', category: 'Privacy' },
    { id: 'cc9.16', title: 'Privacy Governance', description: 'Establish privacy governance structure', category: 'Privacy' },
    { id: 'cc9.17', title: 'Privacy Risk Management', description: 'Identify and manage privacy risks', category: 'Privacy' },
    { id: 'cc9.18', title: 'Privacy Compliance', description: 'Ensure compliance with applicable privacy laws', category: 'Privacy' },
    { id: 'cc9.19', title: 'Privacy Metrics', description: 'Track and report privacy compliance metrics', category: 'Privacy' },
    { id: 'cc9.20', title: 'Privacy Technology', description: 'Implement privacy-enhancing technologies', category: 'Privacy' },
    { id: 'cc9.21', title: 'Privacy Testing', description: 'Test privacy controls and procedures', category: 'Privacy' },
    { id: 'cc9.22', title: 'Privacy Remediation', description: 'Remediate privacy control deficiencies', category: 'Privacy' },
    { id: 'cc9.23', title: 'Privacy Reporting', description: 'Report privacy compliance status to management', category: 'Privacy' },
    { id: 'cc9.24', title: 'Privacy Continuous Improvement', description: 'Continuously improve privacy program', category: 'Privacy' },
    { id: 'cc9.25', title: 'Privacy Vendor Management', description: 'Manage privacy requirements for vendors', category: 'Privacy' },
    { id: 'cc9.26', title: 'Privacy Incident Management', description: 'Manage privacy incidents and breaches', category: 'Privacy' },
    { id: 'cc9.27', title: 'Privacy Training Program', description: 'Maintain privacy training program', category: 'Privacy' },
  ],
  gdpr: [
    { id: 'art5', title: 'Principles of Processing', description: 'Lawfulness, fairness, transparency, purpose limitation, data minimization, accuracy, storage limitation, integrity and confidentiality', category: 'Core Principles' },
    { id: 'art6', title: 'Lawful Basis for Processing', description: 'Identify and document lawful basis for processing personal data', category: 'Lawful Processing' },
    { id: 'art7', title: 'Conditions for Consent', description: 'Obtain and manage valid consent for data processing', category: 'Consent Management' },
    { id: 'art8', title: 'Child Consent', description: 'Obtain parental consent for processing children\'s data', category: 'Consent Management' },
    { id: 'art9', title: 'Special Categories', description: 'Implement additional safeguards for special category data', category: 'Data Protection' },
    { id: 'art12', title: 'Transparent Information', description: 'Provide clear and transparent information to data subjects', category: 'Transparency' },
    { id: 'art13', title: 'Information to be Provided', description: 'Provide information when collecting data from data subject', category: 'Transparency' },
    { id: 'art14', title: 'Information from Third Parties', description: 'Provide information when data obtained from third parties', category: 'Transparency' },
    { id: 'art15', title: 'Right of Access', description: 'Enable data subjects to access their personal data', category: 'Data Subject Rights' },
    { id: 'art16', title: 'Right to Rectification', description: 'Enable data subjects to correct inaccurate data', category: 'Data Subject Rights' },
    { id: 'art17', title: 'Right to Erasure', description: 'Enable data subjects to request deletion of their data', category: 'Data Subject Rights' },
    { id: 'art18', title: 'Right to Restriction', description: 'Enable data subjects to restrict processing', category: 'Data Subject Rights' },
    { id: 'art19', title: 'Notification Obligation', description: 'Notify data subjects of rectification, erasure, or restriction', category: 'Data Subject Rights' },
    { id: 'art20', title: 'Right to Data Portability', description: 'Enable data subjects to receive their data in portable format', category: 'Data Subject Rights' },
    { id: 'art21', title: 'Right to Object', description: 'Enable data subjects to object to processing', category: 'Data Subject Rights' },
    { id: 'art22', title: 'Automated Decision Making', description: 'Implement safeguards for automated decision-making', category: 'Automated Processing' },
    { id: 'art24', title: 'Controller Responsibility', description: 'Implement appropriate technical and organizational measures', category: 'Controller Obligations' },
    { id: 'art25', title: 'Data Protection by Design', description: 'Implement data protection by design and by default', category: 'Privacy by Design' },
    { id: 'art28', title: 'Processor Contracts', description: 'Ensure processors are bound by contract', category: 'Processor Management' },
    { id: 'art30', title: 'Records of Processing', description: 'Maintain records of processing activities', category: 'Documentation' },
    { id: 'art32', title: 'Security of Processing', description: 'Implement appropriate security measures', category: 'Security' },
    { id: 'art33', title: 'Breach Notification to Authority', description: 'Notify supervisory authority of data breaches within 72 hours', category: 'Breach Management' },
    { id: 'art34', title: 'Breach Notification to Data Subject', description: 'Notify data subjects of high-risk breaches', category: 'Breach Management' },
    { id: 'art35', title: 'Data Protection Impact Assessment', description: 'Conduct DPIA for high-risk processing', category: 'Risk Assessment' },
    { id: 'art37', title: 'Data Protection Officer', description: 'Appoint DPO where required', category: 'Governance' },
    { id: 'art38', title: 'DPO Position', description: 'Ensure DPO independence and resources', category: 'Governance' },
    { id: 'art39', title: 'DPO Tasks', description: 'Define DPO tasks and responsibilities', category: 'Governance' },
    { id: 'art40', title: 'Codes of Conduct', description: 'Adopt and comply with codes of conduct', category: 'Compliance' },
    { id: 'art42', title: 'Certification', description: 'Obtain certification where applicable', category: 'Compliance' },
    { id: 'art44', title: 'Transfers - General Principle', description: 'Ensure adequate safeguards for international transfers', category: 'Data Transfers' },
    { id: 'art45', title: 'Transfers - Adequacy Decision', description: 'Verify adequacy decisions for transfers', category: 'Data Transfers' },
    { id: 'art46', title: 'Transfers - Appropriate Safeguards', description: 'Implement appropriate safeguards for transfers', category: 'Data Transfers' },
  ],
  iso27001: [
    { id: 'A.5.1.1', title: 'Policies for Information Security', description: 'Establish information security policies', category: 'Information Security Policies' },
    { id: 'A.5.1.2', title: 'Review of Policies', description: 'Review and update security policies regularly', category: 'Information Security Policies' },
    { id: 'A.6.1.1', title: 'Information Security Roles', description: 'Define and assign information security roles', category: 'Organization of Information Security' },
    { id: 'A.6.1.2', title: 'Segregation of Duties', description: 'Implement segregation of duties', category: 'Organization of Information Security' },
    { id: 'A.6.1.3', title: 'Contact with Authorities', description: 'Maintain contact with relevant authorities', category: 'Organization of Information Security' },
    { id: 'A.6.1.4', title: 'Contact with Special Interest Groups', description: 'Engage with special interest groups', category: 'Organization of Information Security' },
    { id: 'A.6.1.5', title: 'Information Security in Project Management', description: 'Address security in project management', category: 'Organization of Information Security' },
    { id: 'A.6.2.1', title: 'Mobile Device Policy', description: 'Establish mobile device security policy', category: 'Mobile Devices' },
    { id: 'A.6.2.2', title: 'Teleworking', description: 'Implement secure teleworking arrangements', category: 'Teleworking' },
    { id: 'A.7.1.1', title: 'Screening', description: 'Screen personnel before employment', category: 'Human Resource Security' },
    { id: 'A.7.1.2', title: 'Terms and Conditions', description: 'Include security in terms and conditions', category: 'Human Resource Security' },
    { id: 'A.7.2.1', title: 'Management Responsibilities', description: 'Define management security responsibilities', category: 'Human Resource Security' },
    { id: 'A.7.2.2', title: 'Information Security Awareness', description: 'Provide security awareness training', category: 'Human Resource Security' },
    { id: 'A.7.2.3', title: 'Disciplinary Process', description: 'Establish disciplinary process for security violations', category: 'Human Resource Security' },
    { id: 'A.7.3.1', title: 'Termination Responsibilities', description: 'Define termination responsibilities', category: 'Human Resource Security' },
    { id: 'A.8.1.1', title: 'Inventory of Assets', description: 'Maintain inventory of information assets', category: 'Asset Management' },
    { id: 'A.8.1.2', title: 'Ownership of Assets', description: 'Assign ownership of information assets', category: 'Asset Management' },
    { id: 'A.8.1.3', title: 'Acceptable Use of Assets', description: 'Define acceptable use of assets', category: 'Asset Management' },
    { id: 'A.8.1.4', title: 'Return of Assets', description: 'Ensure return of assets upon termination', category: 'Asset Management' },
    { id: 'A.8.2.1', title: 'Classification of Information', description: 'Classify information based on sensitivity', category: 'Information Classification' },
    { id: 'A.8.2.2', title: 'Labeling of Information', description: 'Label information according to classification', category: 'Information Classification' },
    { id: 'A.8.2.3', title: 'Handling of Assets', description: 'Handle assets according to classification', category: 'Information Classification' },
    { id: 'A.8.3.1', title: 'Management of Removable Media', description: 'Manage removable media securely', category: 'Media Handling' },
    { id: 'A.8.3.2', title: 'Disposal of Media', description: 'Securely dispose of media', category: 'Media Handling' },
    { id: 'A.8.3.3', title: 'Physical Media Transfer', description: 'Securely transfer physical media', category: 'Media Handling' },
    { id: 'A.9.1.1', title: 'Access Control Policy', description: 'Establish access control policy', category: 'Access Control' },
    { id: 'A.9.1.2', title: 'Access to Networks', description: 'Control access to networks', category: 'Access Control' },
    { id: 'A.9.2.1', title: 'User Registration', description: 'Register and manage user accounts', category: 'User Access Management' },
    { id: 'A.9.2.2', title: 'User Access Provisioning', description: 'Provision user access appropriately', category: 'User Access Management' },
    { id: 'A.9.2.3', title: 'Management of Privileged Access', description: 'Manage privileged access rights', category: 'User Access Management' },
    { id: 'A.9.2.4', title: 'Management of Secret Authentication', description: 'Manage secret authentication information', category: 'User Access Management' },
    { id: 'A.9.2.5', title: 'Review of User Access', description: 'Review user access rights regularly', category: 'User Access Management' },
    { id: 'A.9.2.6', title: 'Removal of Access Rights', description: 'Remove access rights upon termination', category: 'User Access Management' },
    { id: 'A.9.3.1', title: 'Use of Secret Authentication', description: 'Use secret authentication securely', category: 'User Responsibilities' },
    { id: 'A.9.4.1', title: 'Information Access Restriction', description: 'Restrict access to information', category: 'System and Application Access' },
    { id: 'A.9.4.2', title: 'Secure Log-on Procedures', description: 'Implement secure log-on procedures', category: 'System and Application Access' },
    { id: 'A.9.4.3', title: 'Password Management System', description: 'Implement password management system', category: 'System and Application Access' },
    { id: 'A.9.4.4', title: 'Use of Privileged Utility Programs', description: 'Control use of privileged utilities', category: 'System and Application Access' },
    { id: 'A.9.4.5', title: 'Access Control to Program Source', description: 'Control access to program source code', category: 'System and Application Access' },
    { id: 'A.10.1.1', title: 'Cryptographic Controls', description: 'Implement cryptographic controls', category: 'Cryptography' },
    { id: 'A.10.1.2', title: 'Key Management', description: 'Manage cryptographic keys securely', category: 'Cryptography' },
    { id: 'A.11.1.1', title: 'Physical Security Perimeter', description: 'Define physical security perimeters', category: 'Physical and Environmental Security' },
    { id: 'A.11.1.2', title: 'Physical Entry Controls', description: 'Control physical entry to facilities', category: 'Physical and Environmental Security' },
    { id: 'A.11.1.3', title: 'Securing Offices and Facilities', description: 'Secure offices and facilities', category: 'Physical and Environmental Security' },
    { id: 'A.11.1.4', title: 'Protecting Against External Threats', description: 'Protect against external threats', category: 'Physical and Environmental Security' },
    { id: 'A.11.1.5', title: 'Working in Secure Areas', description: 'Control working in secure areas', category: 'Physical and Environmental Security' },
    { id: 'A.11.1.6', title: 'Delivery and Loading Areas', description: 'Secure delivery and loading areas', category: 'Physical and Environmental Security' },
    { id: 'A.11.2.1', title: 'Equipment Siting and Protection', description: 'Site and protect equipment appropriately', category: 'Equipment' },
    { id: 'A.11.2.2', title: 'Supporting Utilities', description: 'Protect supporting utilities', category: 'Equipment' },
    { id: 'A.11.2.3', title: 'Cabling Security', description: 'Protect cabling security', category: 'Equipment' },
    { id: 'A.11.2.4', title: 'Equipment Maintenance', description: 'Maintain equipment securely', category: 'Equipment' },
    { id: 'A.11.2.5', title: 'Removal of Assets', description: 'Control removal of assets', category: 'Equipment' },
    { id: 'A.11.2.6', title: 'Security of Equipment Off-Premises', description: 'Secure equipment off-premises', category: 'Equipment' },
    { id: 'A.11.2.7', title: 'Secure Disposal or Re-use', description: 'Securely dispose or re-use equipment', category: 'Equipment' },
    { id: 'A.12.1.1', title: 'Documented Operating Procedures', description: 'Document operating procedures', category: 'Operational Procedures' },
    { id: 'A.12.1.2', title: 'Change Management', description: 'Implement change management', category: 'Operational Procedures' },
    { id: 'A.12.1.3', title: 'Capacity Management', description: 'Manage system capacity', category: 'Operational Procedures' },
    { id: 'A.12.1.4', title: 'Separation of Development and Operations', description: 'Separate development and operations', category: 'Operational Procedures' },
    { id: 'A.12.2.1', title: 'Controls Against Malware', description: 'Implement controls against malware', category: 'Protection from Malware' },
    { id: 'A.12.3.1', title: 'Information Backup', description: 'Implement information backup procedures', category: 'Backup' },
    { id: 'A.12.4.1', title: 'Event Logging', description: 'Log security events', category: 'Logging and Monitoring' },
    { id: 'A.12.4.2', title: 'Protection of Log Information', description: 'Protect log information', category: 'Logging and Monitoring' },
    { id: 'A.12.4.3', title: 'Administrator and Operator Logs', description: 'Log administrator and operator activities', category: 'Logging and Monitoring' },
    { id: 'A.12.4.4', title: 'Clock Synchronization', description: 'Synchronize system clocks', category: 'Logging and Monitoring' },
    { id: 'A.12.5.1', title: 'Installation of Software', description: 'Control software installation', category: 'Control of Operational Software' },
    { id: 'A.12.6.1', title: 'Management of Technical Vulnerabilities', description: 'Manage technical vulnerabilities', category: 'Technical Vulnerability Management' },
    { id: 'A.12.6.2', title: 'Restrictions on Software Installation', description: 'Restrict software installation', category: 'Technical Vulnerability Management' },
    { id: 'A.12.7.1', title: 'Information Systems Audit Controls', description: 'Implement audit controls', category: 'Information Systems Audit Considerations' },
    { id: 'A.13.1.1', title: 'Network Controls', description: 'Implement network controls', category: 'Network Security Management' },
    { id: 'A.13.1.2', title: 'Security of Network Services', description: 'Secure network services', category: 'Network Security Management' },
    { id: 'A.13.1.3', title: 'Segregation of Networks', description: 'Segregate networks appropriately', category: 'Network Security Management' },
    { id: 'A.13.2.1', title: 'Information Transfer Policies', description: 'Establish information transfer policies', category: 'Information Transfer' },
    { id: 'A.13.2.2', title: 'Agreements on Information Transfer', description: 'Establish agreements for information transfer', category: 'Information Transfer' },
    { id: 'A.13.2.3', title: 'Electronic Messaging', description: 'Secure electronic messaging', category: 'Information Transfer' },
    { id: 'A.13.2.4', title: 'Confidentiality Agreements', description: 'Use confidentiality agreements', category: 'Information Transfer' },
    { id: 'A.14.1.1', title: 'Information Security Requirements', description: 'Define security requirements', category: 'Security Requirements of Information Systems' },
    { id: 'A.14.1.2', title: 'Securing Applications on Public Networks', description: 'Secure applications on public networks', category: 'Security Requirements of Information Systems' },
    { id: 'A.14.1.3', title: 'Protecting Application Services', description: 'Protect application services', category: 'Security Requirements of Information Systems' },
    { id: 'A.14.2.1', title: 'Secure Development Policy', description: 'Establish secure development policy', category: 'Security in Development and Support Processes' },
    { id: 'A.14.2.2', title: 'System Change Control Procedures', description: 'Implement change control procedures', category: 'Security in Development and Support Processes' },
    { id: 'A.14.2.3', title: 'Technical Review of Applications', description: 'Conduct technical reviews', category: 'Security in Development and Support Processes' },
    { id: 'A.14.2.4', title: 'Restrictions on Changes to Software Packages', description: 'Restrict changes to software packages', category: 'Security in Development and Support Processes' },
    { id: 'A.14.2.5', title: 'Secure System Engineering Principles', description: 'Apply secure engineering principles', category: 'Security in Development and Support Processes' },
    { id: 'A.14.2.6', title: 'Secure Development Environment', description: 'Secure development environment', category: 'Security in Development and Support Processes' },
    { id: 'A.14.2.7', title: 'Outsourced Development', description: 'Manage outsourced development securely', category: 'Security in Development and Support Processes' },
    { id: 'A.14.2.8', title: 'System Security Testing', description: 'Test system security', category: 'Security in Development and Support Processes' },
    { id: 'A.14.2.9', title: 'System Acceptance Testing', description: 'Conduct acceptance testing', category: 'Security in Development and Support Processes' },
    { id: 'A.14.3.1', title: 'Protection of Test Data', description: 'Protect test data', category: 'Test Data' },
    { id: 'A.15.1.1', title: 'Information Security Policy for Supplier Relationships', description: 'Establish supplier security policy', category: 'Information Security in Supplier Relationships' },
    { id: 'A.15.1.2', title: 'Addressing Security in Supplier Agreements', description: 'Address security in supplier agreements', category: 'Information Security in Supplier Relationships' },
    { id: 'A.15.1.3', title: 'Information and Communication Technology Supply Chain', description: 'Manage ICT supply chain security', category: 'Information Security in Supplier Relationships' },
    { id: 'A.15.2.1', title: 'Monitoring and Review of Supplier Services', description: 'Monitor and review supplier services', category: 'Supplier Service Delivery Management' },
    { id: 'A.15.2.2', title: 'Managing Changes to Supplier Services', description: 'Manage changes to supplier services', category: 'Supplier Service Delivery Management' },
    { id: 'A.16.1.1', title: 'Responsibilities and Procedures', description: 'Define incident response responsibilities', category: 'Information Security Incident Management' },
    { id: 'A.16.1.2', title: 'Reporting Information Security Events', description: 'Report security events', category: 'Information Security Incident Management' },
    { id: 'A.16.1.3', title: 'Reporting Information Security Weaknesses', description: 'Report security weaknesses', category: 'Information Security Incident Management' },
    { id: 'A.16.1.4', title: 'Assessment of and Decision on Information Security Events', description: 'Assess and decide on security events', category: 'Information Security Incident Management' },
    { id: 'A.16.1.5', title: 'Response to Information Security Incidents', description: 'Respond to security incidents', category: 'Information Security Incident Management' },
    { id: 'A.16.1.6', title: 'Learning from Information Security Incidents', description: 'Learn from security incidents', category: 'Information Security Incident Management' },
    { id: 'A.16.1.7', title: 'Collection of Evidence', description: 'Collect evidence from incidents', category: 'Information Security Incident Management' },
    { id: 'A.17.1.1', title: 'Planning Information Security Continuity', description: 'Plan information security continuity', category: 'Information Security Aspects of Business Continuity Management' },
    { id: 'A.17.1.2', title: 'Implementing Information Security Continuity', description: 'Implement security continuity', category: 'Information Security Aspects of Business Continuity Management' },
    { id: 'A.17.1.3', title: 'Verify, Review and Evaluate Information Security Continuity', description: 'Verify and review security continuity', category: 'Information Security Aspects of Business Continuity Management' },
    { id: 'A.17.2.1', title: 'Availability of Information Processing Facilities', description: 'Ensure availability of processing facilities', category: 'Redundancies' },
    { id: 'A.18.1.1', title: 'Identification of Applicable Legislation', description: 'Identify applicable legislation', category: 'Compliance' },
    { id: 'A.18.1.2', title: 'Intellectual Property Rights', description: 'Protect intellectual property rights', category: 'Compliance' },
    { id: 'A.18.1.3', title: 'Protection of Records', description: 'Protect records', category: 'Compliance' },
    { id: 'A.18.1.4', title: 'Privacy and Protection of PII', description: 'Protect privacy and PII', category: 'Compliance' },
    { id: 'A.18.1.5', title: 'Regulation of Cryptographic Controls', description: 'Comply with cryptographic regulations', category: 'Compliance' },
    { id: 'A.18.2.1', title: 'Independent Review of Information Security', description: 'Conduct independent security reviews', category: 'Information Security Reviews' },
    { id: 'A.18.2.2', title: 'Compliance with Security Policies', description: 'Ensure compliance with security policies', category: 'Information Security Reviews' },
    { id: 'A.18.2.3', title: 'Technical Compliance Review', description: 'Conduct technical compliance reviews', category: 'Information Security Reviews' },
  ],
  pcidss: [
    { id: 'req1', title: 'Install and Maintain Firewall Configuration', description: 'Install and maintain a firewall configuration to protect cardholder data', category: 'Network Security' },
    { id: 'req2', title: 'Do Not Use Vendor Defaults', description: 'Do not use vendor-supplied defaults for system passwords and other security parameters', category: 'System Configuration' },
    { id: 'req3', title: 'Protect Stored Cardholder Data', description: 'Protect stored cardholder data', category: 'Data Protection' },
    { id: 'req4', title: 'Encrypt Transmission of Cardholder Data', description: 'Encrypt transmission of cardholder data across open, public networks', category: 'Data Encryption' },
    { id: 'req5', title: 'Use and Regularly Update Anti-Virus', description: 'Use and regularly update anti-virus software or programs', category: 'Malware Protection' },
    { id: 'req6', title: 'Develop and Maintain Secure Systems', description: 'Develop and maintain secure systems and applications', category: 'Secure Development' },
    { id: 'req7', title: 'Restrict Access to Cardholder Data', description: 'Restrict access to cardholder data by business need-to-know', category: 'Access Control' },
    { id: 'req8', title: 'Assign Unique ID to Each Person', description: 'Assign a unique ID to each person with computer access', category: 'Access Control' },
    { id: 'req9', title: 'Restrict Physical Access', description: 'Restrict physical access to cardholder data', category: 'Physical Security' },
    { id: 'req10', title: 'Track and Monitor Network Access', description: 'Track and monitor all access to network resources and cardholder data', category: 'Logging and Monitoring' },
    { id: 'req11', title: 'Regularly Test Security Systems', description: 'Regularly test security systems and processes', category: 'Security Testing' },
    { id: 'req12', title: 'Maintain Information Security Policy', description: 'Maintain a policy that addresses information security for all personnel', category: 'Security Policy' },
  ],
  hipaa: [
    { id: '164.308', title: 'Administrative Safeguards', description: 'Implement administrative safeguards for ePHI', category: 'Administrative Safeguards' },
    { id: '164.310', title: 'Physical Safeguards', description: 'Implement physical safeguards for ePHI', category: 'Physical Safeguards' },
    { id: '164.312', title: 'Technical Safeguards', description: 'Implement technical safeguards for ePHI', category: 'Technical Safeguards' },
    { id: '164.314', title: 'Organizational Requirements', description: 'Meet organizational requirements', category: 'Organizational Requirements' },
    { id: '164.316', title: 'Policies and Procedures', description: 'Maintain policies and procedures', category: 'Policies and Procedures' },
    { id: '164.502', title: 'Uses and Disclosures', description: 'Control uses and disclosures of PHI', category: 'Privacy Rule' },
    { id: '164.504', title: 'Organizational Requirements', description: 'Meet organizational requirements for privacy', category: 'Privacy Rule' },
    { id: '164.506', title: 'Uses and Disclosures for Treatment', description: 'Permit uses and disclosures for treatment', category: 'Privacy Rule' },
    { id: '164.508', title: 'Uses and Disclosures Requiring Authorization', description: 'Require authorization for certain uses', category: 'Privacy Rule' },
    { id: '164.510', title: 'Uses and Disclosures for Which Authorization Not Required', description: 'Define uses not requiring authorization', category: 'Privacy Rule' },
    { id: '164.512', title: 'Uses and Disclosures for Public Health', description: 'Permit uses for public health purposes', category: 'Privacy Rule' },
    { id: '164.514', title: 'Minimum Necessary', description: 'Apply minimum necessary standard', category: 'Privacy Rule' },
    { id: '164.520', title: 'Notice of Privacy Practices', description: 'Provide notice of privacy practices', category: 'Privacy Rule' },
    { id: '164.522', title: 'Right to Request Restrictions', description: 'Enable right to request restrictions', category: 'Privacy Rule' },
    { id: '164.524', title: 'Right to Access', description: 'Enable right to access PHI', category: 'Privacy Rule' },
    { id: '164.526', title: 'Right to Amend', description: 'Enable right to amend PHI', category: 'Privacy Rule' },
    { id: '164.528', title: 'Right to Accounting', description: 'Enable right to accounting of disclosures', category: 'Privacy Rule' },
    { id: '164.530', title: 'Administrative Requirements', description: 'Meet administrative requirements', category: 'Privacy Rule' },
    { id: '164.532', title: 'Transition Provisions', description: 'Comply with transition provisions', category: 'Privacy Rule' },
    { id: '164.534', title: 'Effective Dates', description: 'Comply with effective dates', category: 'Privacy Rule' },
    { id: '164.308.1', title: 'Security Management Process', description: 'Implement security management process', category: 'Administrative Safeguards' },
    { id: '164.308.2', title: 'Assigned Security Responsibility', description: 'Assign security responsibility', category: 'Administrative Safeguards' },
    { id: '164.308.3', title: 'Workforce Security', description: 'Implement workforce security', category: 'Administrative Safeguards' },
    { id: '164.308.4', title: 'Information Access Management', description: 'Implement information access management', category: 'Administrative Safeguards' },
    { id: '164.308.5', title: 'Security Awareness and Training', description: 'Provide security awareness and training', category: 'Administrative Safeguards' },
    { id: '164.308.6', title: 'Security Incident Procedures', description: 'Implement security incident procedures', category: 'Administrative Safeguards' },
    { id: '164.308.7', title: 'Contingency Plan', description: 'Implement contingency plan', category: 'Administrative Safeguards' },
    { id: '164.308.8', title: 'Evaluation', description: 'Conduct periodic evaluations', category: 'Administrative Safeguards' },
    { id: '164.308.9', title: 'Business Associate Contracts', description: 'Establish business associate contracts', category: 'Administrative Safeguards' },
    { id: '164.310.1', title: 'Facility Access Controls', description: 'Implement facility access controls', category: 'Physical Safeguards' },
    { id: '164.310.2', title: 'Workstation Use', description: 'Control workstation use', category: 'Physical Safeguards' },
    { id: '164.310.3', title: 'Workstation Security', description: 'Implement workstation security', category: 'Physical Safeguards' },
    { id: '164.310.4', title: 'Device and Media Controls', description: 'Control devices and media', category: 'Physical Safeguards' },
    { id: '164.312.1', title: 'Access Control', description: 'Implement access controls', category: 'Technical Safeguards' },
    { id: '164.312.2', title: 'Audit Controls', description: 'Implement audit controls', category: 'Technical Safeguards' },
    { id: '164.312.3', title: 'Integrity', description: 'Ensure data integrity', category: 'Technical Safeguards' },
    { id: '164.312.4', title: 'Transmission Security', description: 'Implement transmission security', category: 'Technical Safeguards' },
    { id: '164.312.5', title: 'Person or Entity Authentication', description: 'Implement authentication', category: 'Technical Safeguards' },
    { id: '164.312.6', title: 'Encryption and Decryption', description: 'Implement encryption and decryption', category: 'Technical Safeguards' },
  ],
  ccpa: [
    { id: '1798.100', title: 'Notice at Collection', description: 'Provide notice at collection of personal information', category: 'Transparency' },
    { id: '1798.105', title: 'Right to Delete', description: 'Enable consumers to request deletion of personal information', category: 'Consumer Rights' },
    { id: '1798.110', title: 'Right to Know', description: 'Enable consumers to know what personal information is collected', category: 'Consumer Rights' },
    { id: '1798.115', title: 'Right to Opt-Out', description: 'Enable consumers to opt-out of sale of personal information', category: 'Consumer Rights' },
    { id: '1798.120', title: 'Right to Non-Discrimination', description: 'Prohibit discrimination for exercising rights', category: 'Consumer Rights' },
    { id: '1798.125', title: 'Opt-In for Minors', description: 'Require opt-in consent for sale of minors\' information', category: 'Consumer Rights' },
    { id: '1798.130', title: 'Methods for Submitting Requests', description: 'Provide methods for submitting consumer requests', category: 'Consumer Rights' },
    { id: '1798.135', title: 'Disclosure Requirements', description: 'Disclose consumer rights and how to exercise them', category: 'Transparency' },
    { id: '1798.140', title: 'Definitions', description: 'Define terms used in CCPA', category: 'Definitions' },
    { id: '1798.145', title: 'Exemptions', description: 'Identify applicable exemptions', category: 'Exemptions' },
    { id: '1798.150', title: 'Private Right of Action', description: 'Address private right of action for data breaches', category: 'Enforcement' },
    { id: '1798.155', title: 'Civil Penalties', description: 'Understand civil penalties for violations', category: 'Enforcement' },
    { id: '1798.160', title: 'Regulations', description: 'Comply with CCPA regulations', category: 'Compliance' },
    { id: '1798.165', title: 'Severability', description: 'Address severability of provisions', category: 'Legal' },
    { id: '1798.170', title: 'Effective Date', description: 'Comply with effective dates', category: 'Legal' },
    { id: '1798.175', title: 'Preemption', description: 'Address preemption of local laws', category: 'Legal' },
    { id: '1798.180', title: 'Business Associate Agreements', description: 'Establish business associate agreements', category: 'Third Parties' },
    { id: '1798.185', title: 'Service Provider Agreements', description: 'Establish service provider agreements', category: 'Third Parties' },
    { id: '1798.190', title: 'Data Processing Agreements', description: 'Establish data processing agreements', category: 'Third Parties' },
    { id: '1798.195', title: 'Vendor Management', description: 'Manage vendors for CCPA compliance', category: 'Third Parties' },
    { id: '1798.200', title: 'Data Inventory', description: 'Maintain inventory of personal information', category: 'Data Management' },
    { id: '1798.205', title: 'Data Mapping', description: 'Map data flows and processing activities', category: 'Data Management' },
    { id: '1798.210', title: 'Data Retention', description: 'Establish data retention policies', category: 'Data Management' },
    { id: '1798.215', title: 'Data Minimization', description: 'Minimize collection of personal information', category: 'Data Management' },
    { id: '1798.220', title: 'Security Measures', description: 'Implement reasonable security measures', category: 'Security' },
    { id: '1798.225', title: 'Breach Notification', description: 'Notify consumers of data breaches', category: 'Breach Management' },
    { id: '1798.230', title: 'Training', description: 'Train personnel on CCPA requirements', category: 'Training' },
    { id: '1798.235', title: 'Documentation', description: 'Maintain documentation of compliance efforts', category: 'Documentation' },
  ],
};

// Compliance frameworks
export const COMPLIANCE_FRAMEWORKS = {
  SOC2: {
    name: 'SOC 2 Type II',
    type: 'soc2',
    requirements: FRAMEWORK_REQUIREMENTS.soc2.length,
    description: 'Service Organization Control 2 - Security, availability, processing integrity, confidentiality, and privacy',
  },
  GDPR: {
    name: 'GDPR',
    type: 'gdpr',
    requirements: FRAMEWORK_REQUIREMENTS.gdpr.length,
    description: 'General Data Protection Regulation - EU data protection and privacy',
  },
  ISO27001: {
    name: 'ISO 27001',
    type: 'iso27001',
    requirements: FRAMEWORK_REQUIREMENTS.iso27001.length,
    description: 'Information Security Management System standard',
  },
  PCIDSS: {
    name: 'PCI DSS',
    type: 'pcidss',
    requirements: FRAMEWORK_REQUIREMENTS.pcidss.length,
    description: 'Payment Card Industry Data Security Standard',
  },
  HIPAA: {
    name: 'HIPAA',
    type: 'hipaa',
    requirements: FRAMEWORK_REQUIREMENTS.hipaa.length,
    description: 'Health Insurance Portability and Accountability Act',
  },
  CCPA: {
    name: 'CCPA',
    type: 'ccpa',
    requirements: FRAMEWORK_REQUIREMENTS.ccpa.length,
    description: 'California Consumer Privacy Act',
  },
};

// Security control categories
export const SECURITY_CONTROL_CATEGORIES = [
  'Access Control',
  'Data Protection',
  'Network Security',
  'Incident Response',
  'Business Continuity',
  'Vulnerability Management',
  'Security Monitoring',
  'Compliance Management',
];

export interface ComplianceFrameworkStatus {
  frameworkType: string;
  status: 'compliant' | 'in-progress' | 'pending' | 'non-compliant';
  score: number;
  requirements: number;
  completed: number;
  lastAudit?: Date;
  nextAudit?: Date;
  certificationNumber?: string;
  auditor?: string;
  notes?: string;
}

export interface SecurityControl {
  id: string;
  category: string;
  name: string;
  description: string;
  status: 'enabled' | 'disabled' | 'partial';
  coverage: number; // 0-100
  lastTested?: Date;
  nextTest?: Date;
  evidence?: string;
}

export interface CompliancePolicy {
  id: string;
  name: string;
  category: 'data-protection' | 'access-control' | 'backup-recovery' | 'privacy' | 'incident-response';
  description: string;
  enabled: boolean;
  lastUpdated: Date;
  version: string;
  content: string;
}

export const complianceService = {
  /**
   * Get detailed requirements for a framework
   */
  getFrameworkRequirements: async (frameworkType: string) => {
    const requirements = FRAMEWORK_REQUIREMENTS[frameworkType.toLowerCase()];
    if (!requirements) {
      throw new NotFoundError(`Framework requirements not found for: ${frameworkType}`);
    }
    return requirements;
  },

  /**
   * Get compliance frameworks status for organization
   */
  getFrameworks: async (orgId: string, userId: string) => {
    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    // Get compliance data from org settings or create default
    let complianceData: any = {};
    try {
      const orgSettings = await prisma.orgSettings.findUnique({
        where: { orgId },
      });
      if (orgSettings && (orgSettings as any).complianceJson) {
        complianceData = (orgSettings as any).complianceJson as any;
      }
    } catch (error) {
      logger.warn('Could not fetch compliance data from org settings');
    }

    const frameworks = Object.values(COMPLIANCE_FRAMEWORKS).map((framework) => {
      const frameworkData = complianceData.frameworks?.[framework.type] || {};
      const completed = frameworkData.completed || 0;
      const score = framework.requirements > 0 
        ? Math.round((completed / framework.requirements) * 100) 
        : 0;

      return {
        name: framework.name,
        type: framework.type,
        status: frameworkData.status || (score >= 95 ? 'compliant' : score >= 70 ? 'in-progress' : 'pending'),
        score,
        requirements: framework.requirements,
        completed,
        lastAudit: frameworkData.lastAudit ? new Date(frameworkData.lastAudit) : null,
        nextAudit: frameworkData.nextAudit ? new Date(frameworkData.nextAudit) : null,
        certificationNumber: frameworkData.certificationNumber || null,
        auditor: frameworkData.auditor || null,
        description: framework.description,
      };
    });

    return frameworks;
  },

  /**
   * Update framework status
   */
  updateFramework: async (
    orgId: string,
    userId: string,
    frameworkType: string,
    data: Partial<ComplianceFrameworkStatus>
  ) => {
    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!role || role.role !== 'admin') {
      throw new ForbiddenError('Only admins can update compliance frameworks');
    }

    if (!COMPLIANCE_FRAMEWORKS[frameworkType.toUpperCase() as keyof typeof COMPLIANCE_FRAMEWORKS]) {
      throw new ValidationError(`Invalid framework type: ${frameworkType}`);
    }

    // Get or create org settings
    let orgSettings = await prisma.orgSettings.findUnique({
      where: { orgId },
    });

    if (!orgSettings) {
      const org = await prisma.org.findUnique({ where: { id: orgId } });
      if (!org) {
        throw new NotFoundError('Organization not found');
      }
      orgSettings = await prisma.orgSettings.create({
        data: {
          orgId,
          currency: org.currency,
          timezone: org.timezone,
          region: org.dataRegion,
        },
      });
    }

    // Update compliance data
    const complianceJson = ((orgSettings as any).complianceJson as any) || {};
    if (!complianceJson.frameworks) {
      complianceJson.frameworks = {};
    }
    if (!complianceJson.frameworks[frameworkType]) {
      complianceJson.frameworks[frameworkType] = {};
    }

    complianceJson.frameworks[frameworkType] = {
      ...complianceJson.frameworks[frameworkType],
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    // Update org settings using raw SQL to update JSON field
    // Note: Column names are camelCase: orgId, updatedById (not org_id, updated_by_id)
    await prisma.$executeRawUnsafe(
      `UPDATE org_settings SET compliance_json = $1::jsonb, "updatedById" = $2::uuid, updated_at = NOW() WHERE "orgId" = $3::uuid`,
      JSON.stringify(complianceJson),
      userId || null,
      orgId
    );

    await auditService.log({
      actorUserId: userId,
      orgId,
      action: 'compliance_framework_updated',
      objectType: 'compliance_framework',
      objectId: undefined, // frameworkType is a string, not UUID
      metaJson: { frameworkType, ...data },
    });

    return await complianceService.getFrameworks(orgId, userId);
  },

  /**
   * Get security controls
   */
  getSecurityControls: async (orgId: string, userId: string) => {
    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    // Get security controls from org settings
    let controlsData: any = {};
    try {
      const orgSettings = await prisma.orgSettings.findUnique({
        where: { orgId },
      });
      if (orgSettings && (orgSettings as any).securityControlsJson) {
        controlsData = (orgSettings as any).securityControlsJson as any;
      }
    } catch (error) {
      logger.warn('Could not fetch security controls from org settings');
    }

    // Default controls if none exist
    const defaultControls: SecurityControl[] = [
      // Access Control
      { id: 'mfa', category: 'Access Control', name: 'Multi-Factor Authentication', description: 'Required for all users', status: 'enabled', coverage: 100 },
      { id: 'rbac', category: 'Access Control', name: 'Role-Based Access Control', description: 'Granular permissions system', status: 'enabled', coverage: 100 },
      { id: 'sso', category: 'Access Control', name: 'Single Sign-On', description: 'SAML/OAuth integration', status: 'enabled', coverage: 95 },
      { id: 'password-policy', category: 'Access Control', name: 'Password Policy', description: 'Strong password requirements', status: 'enabled', coverage: 100 },
      // Data Protection
      { id: 'encryption-rest', category: 'Data Protection', name: 'Data Encryption at Rest', description: 'AES-256 encryption', status: 'enabled', coverage: 100 },
      { id: 'encryption-transit', category: 'Data Protection', name: 'Data Encryption in Transit', description: 'TLS 1.3 for all connections', status: 'enabled', coverage: 100 },
      { id: 'dlp', category: 'Data Protection', name: 'Data Loss Prevention', description: 'Automated data protection', status: 'enabled', coverage: 85 },
      { id: 'backup', category: 'Data Protection', name: 'Backup & Recovery', description: 'Automated daily backups', status: 'enabled', coverage: 100 },
      // Network Security
      { id: 'firewall', category: 'Network Security', name: 'Firewall Protection', description: 'Network-level protection', status: 'enabled', coverage: 100 },
      { id: 'ids', category: 'Network Security', name: 'Intrusion Detection', description: 'Real-time threat detection', status: 'enabled', coverage: 90 },
      { id: 'vpn', category: 'Network Security', name: 'VPN Access', description: 'Secure remote access', status: 'enabled', coverage: 100 },
      { id: 'monitoring', category: 'Network Security', name: 'Network Monitoring', description: '24/7 network monitoring', status: 'enabled', coverage: 95 },
    ];

    const storedControls = controlsData.controls || [];
    const controls = storedControls.length > 0 
      ? storedControls 
      : defaultControls.map(c => ({ ...c, lastTested: null, nextTest: null }));

    // Group by category
    const grouped: Record<string, SecurityControl[]> = {};
    SECURITY_CONTROL_CATEGORIES.forEach((category) => {
      grouped[category] = controls.filter((c: SecurityControl) => c.category === category);
    });

    return grouped;
  },

  /**
   * Update security control
   */
  updateSecurityControl: async (
    orgId: string,
    userId: string,
    controlId: string,
    data: Partial<SecurityControl>
  ) => {
    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!role || role.role !== 'admin') {
      throw new ForbiddenError('Only admins can update security controls');
    }

    // Get or create org settings
    let orgSettings = await prisma.orgSettings.findUnique({
      where: { orgId },
    });

    if (!orgSettings) {
      const org = await prisma.org.findUnique({ where: { id: orgId } });
      if (!org) {
        throw new NotFoundError('Organization not found');
      }
      orgSettings = await prisma.orgSettings.create({
        data: {
          orgId,
          currency: org.currency,
          timezone: org.timezone,
          region: org.dataRegion,
        },
      });
    }

    // Update security controls
    const securityControlsJson = ((orgSettings as any).securityControlsJson as any) || { controls: [] };
    const controls = securityControlsJson.controls || [];
    const index = controls.findIndex((c: SecurityControl) => c.id === controlId);

    if (index >= 0) {
      controls[index] = { ...controls[index], ...data };
    } else {
      controls.push({ id: controlId, ...data });
    }

    securityControlsJson.controls = controls;

    // Update org settings using raw SQL to update JSON field
    // Note: Column names are camelCase: orgId, updatedById
    await prisma.$executeRawUnsafe(
      `UPDATE org_settings SET security_controls_json = $1::jsonb, "updatedById" = $2::uuid, updated_at = NOW() WHERE "orgId" = $3::uuid`,
      JSON.stringify(securityControlsJson),
      userId || null,
      orgId
    );

    await auditService.log({
      actorUserId: userId,
      orgId,
      action: 'security_control_updated',
      objectType: 'security_control',
      objectId: undefined, // controlId is a string, not UUID
      metaJson: { controlId, ...data },
    });

    return await complianceService.getSecurityControls(orgId, userId);
  },

  /**
   * Get audit logs for compliance
   */
  getAuditLogs: async (
    orgId: string,
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      action?: string;
      objectType?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ) => {
    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    const where: any = { orgId };

    if (options?.action) {
      where.action = options.action;
    }
    if (options?.objectType) {
      where.objectType = options.objectType;
    }
    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 100,
        skip: options?.offset || 0,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Fetch user details for logs that have actorUserId
    const userIds = [...new Set(logs.map(log => log.actorUserId).filter(Boolean) as string[])];
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, name: true },
        })
      : [];

    const userMap = new Map(users.map(u => [u.id, u]));

    return {
      logs: logs.map((log) => {
        const user = log.actorUserId ? userMap.get(log.actorUserId) : null;
        return {
          id: log.id,
          timestamp: log.createdAt,
          user: user?.email || 'system',
          userName: user?.name || null,
          action: log.action,
          objectType: log.objectType,
          objectId: log.objectId,
          resource: `${log.objectType || 'unknown'}:${log.objectId || 'unknown'}`,
          status: 'success', // Can be determined from metadata
          ip: (log.metaJson as any)?.ipAddress || 'internal',
          metadata: log.metaJson,
        };
      }),
      total,
    };
  },

  /**
   * Get compliance policies
   */
  getPolicies: async (orgId: string, userId: string) => {
    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    // Get policies from org settings
    let policiesData: any = {};
    try {
      const orgSettings = await prisma.orgSettings.findUnique({
        where: { orgId },
      });
      if (orgSettings && (orgSettings as any).policiesJson) {
        policiesData = (orgSettings as any).policiesJson as any;
      }
    } catch (error) {
      logger.warn('Could not fetch policies from org settings');
    }

    // Default policies
    const defaultPolicies: CompliancePolicy[] = [
      {
        id: 'data-encryption',
        name: 'Data Encryption Policy',
        category: 'data-protection',
        description: 'AES-256 encryption for all data at rest and in transit',
        enabled: true,
        lastUpdated: new Date(),
        version: '1.0',
        content: 'All data must be encrypted using AES-256. TLS 1.3 required for all connections.',
      },
      {
        id: 'data-retention',
        name: 'Data Retention Policy',
        category: 'data-protection',
        description: 'Automatic data purging after retention period',
        enabled: true,
        lastUpdated: new Date(),
        version: '1.0',
        content: 'Data will be automatically purged after 7 years as per regulatory requirements.',
      },
      {
        id: 'mfa-requirement',
        name: 'Multi-Factor Authentication Policy',
        category: 'access-control',
        description: 'MFA required for all users',
        enabled: true,
        lastUpdated: new Date(),
        version: '1.0',
        content: 'All users must enable multi-factor authentication for account access.',
      },
      {
        id: 'session-timeout',
        name: 'Session Timeout Policy',
        category: 'access-control',
        description: 'Auto-logout after inactivity',
        enabled: true,
        lastUpdated: new Date(),
        version: '1.0',
        content: 'Sessions will automatically timeout after 30 minutes of inactivity.',
      },
      {
        id: 'backup-schedule',
        name: 'Backup & Recovery Policy',
        category: 'backup-recovery',
        description: 'Daily automated backups with 90-day retention',
        enabled: true,
        lastUpdated: new Date(),
        version: '1.0',
        content: 'Backups are performed daily at 2:00 AM UTC. Retention period is 90 days.',
      },
      {
        id: 'privacy-by-design',
        name: 'Privacy by Design Policy',
        category: 'privacy',
        description: 'Default privacy settings and GDPR compliance',
        enabled: true,
        lastUpdated: new Date(),
        version: '1.0',
        content: 'Privacy is built into all systems by default. GDPR compliant cookie consent and data subject rights.',
      },
    ];

    const storedPolicies = policiesData.policies || [];
    return storedPolicies.length > 0 ? storedPolicies : defaultPolicies;
  },

  /**
   * Update compliance policy
   */
  updatePolicy: async (
    orgId: string,
    userId: string,
    policyId: string,
    data: Partial<CompliancePolicy>
  ) => {
    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!role || role.role !== 'admin') {
      throw new ForbiddenError('Only admins can update compliance policies');
    }

    // Get or create org settings
    let orgSettings = await prisma.orgSettings.findUnique({
      where: { orgId },
    });

    if (!orgSettings) {
      const org = await prisma.org.findUnique({ where: { id: orgId } });
      if (!org) {
        throw new NotFoundError('Organization not found');
      }
      orgSettings = await prisma.orgSettings.create({
        data: {
          orgId,
          currency: org.currency,
          timezone: org.timezone,
          region: org.dataRegion,
        },
      });
    }

    // Update policies
    const policiesJson = ((orgSettings as any).policiesJson as any) || { policies: [] };
    const policies = policiesJson.policies || [];
    const index = policies.findIndex((p: CompliancePolicy) => p.id === policyId);

    if (index >= 0) {
      policies[index] = { 
        ...policies[index], 
        ...data,
        lastUpdated: new Date(),
        version: data.version || policies[index].version || '1.0',
      };
    } else {
      policies.push({ 
        id: policyId, 
        ...data,
        lastUpdated: new Date(),
        version: data.version || '1.0',
      } as CompliancePolicy);
    }

    policiesJson.policies = policies;

    // Update org settings using raw SQL to update JSON field
    // Note: Column names are camelCase: orgId, updatedById
    await prisma.$executeRawUnsafe(
      `UPDATE org_settings SET policies_json = $1::jsonb, "updatedById" = $2::uuid, updated_at = NOW() WHERE "orgId" = $3::uuid`,
      JSON.stringify(policiesJson),
      userId || null,
      orgId
    );

    await auditService.log({
      actorUserId: userId,
      orgId,
      action: 'compliance_policy_updated',
      objectType: 'compliance_policy',
      objectId: undefined, // policyId is a string, not UUID
      metaJson: { policyId, ...data },
    });

    return await complianceService.getPolicies(orgId, userId);
  },

  /**
   * Get overall security score
   */
  getSecurityScore: async (orgId: string, userId: string) => {
    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    const [frameworks, controls] = await Promise.all([
      complianceService.getFrameworks(orgId, userId),
      complianceService.getSecurityControls(orgId, userId),
    ]);

    // Calculate overall score
    const frameworkScores = frameworks.map(f => f.score);
    const avgFrameworkScore = frameworkScores.length > 0
      ? frameworkScores.reduce((a, b) => a + b, 0) / frameworkScores.length
      : 0;

    const allControls = Object.values(controls).flat();
    const controlScores = allControls.map(c => c.coverage);
    const avgControlScore = controlScores.length > 0
      ? controlScores.reduce((a, b) => a + b, 0) / controlScores.length
      : 0;

    const overallScore = Math.round((avgFrameworkScore * 0.6 + avgControlScore * 0.4));

    // Count critical issues (controls with coverage < 80%)
    const criticalIssues = allControls.filter(c => c.coverage < 80 && c.status !== 'disabled').length;

    return {
      overallScore,
      frameworkScore: Math.round(avgFrameworkScore),
      controlScore: Math.round(avgControlScore),
      frameworksCount: frameworks.length,
      controlsCount: allControls.length,
      activeControls: allControls.filter(c => c.status === 'enabled').length,
      criticalIssues,
    };
  },

  /**
   * Export compliance report
   */
  exportComplianceReport: async (orgId: string, userId: string) => {
    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!role || role.role !== 'admin') {
      throw new ForbiddenError('Only admins can export compliance reports');
    }

    const [frameworks, controls, policies, auditLogs, securityScore] = await Promise.all([
      complianceService.getFrameworks(orgId, userId),
      complianceService.getSecurityControls(orgId, userId),
      complianceService.getPolicies(orgId, userId),
      complianceService.getAuditLogs(orgId, userId, { limit: 1000 }),
      complianceService.getSecurityScore(orgId, userId),
    ]);

    const org = await prisma.org.findUnique({
      where: { id: orgId },
    });

    // Query details separately to avoid Prisma include issues
    let orgDetails = null;
    try {
      orgDetails = await prisma.orgDetails.findUnique({
        where: { orgId },
      });
    } catch (error: any) {
      logger.warn(`Could not fetch org details: ${error.message}`);
    }

    await auditService.log({
      actorUserId: userId,
      orgId,
      action: 'compliance_report_exported',
      objectType: 'compliance_report',
      objectId: orgId,
      metaJson: { exportDate: new Date().toISOString() },
    });

    return {
      exportDate: new Date().toISOString(),
      organization: {
        id: org?.id,
        name: org?.name,
        industry: orgDetails?.industry || null,
      },
      securityScore,
      frameworks,
      controls: Object.values(controls).flat(),
      policies,
      auditLogs: auditLogs.logs.slice(0, 100), // Sample of recent logs
      summary: {
        totalFrameworks: frameworks.length,
        compliantFrameworks: frameworks.filter(f => f.status === 'compliant').length,
        totalControls: Object.values(controls).flat().length,
        enabledControls: Object.values(controls).flat().filter(c => c.status === 'enabled').length,
        totalPolicies: policies.length,
        activePolicies: policies.filter((p: CompliancePolicy) => p.enabled).length,
      },
    };
  },
};

