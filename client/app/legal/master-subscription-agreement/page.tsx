import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, FileText, CheckCircle, Shield, Scale, Clock, AlertTriangle, BookOpen, Building2, Gavel, Lock, Globe, Cpu, CreditCard, Users, Eye, RefreshCw, Ban, Handshake } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service — Master Subscription Agreement | FinaPilot',
  description: 'Enterprise Cloud Services Agreement, Terms of Use, AI Data Processing Terms, and Acceptable Use Policy for the FinaPilot AI-Powered FP&A Platform. SOC 2 Type II compliant.',
  keywords: 'FinaPilot terms of service, SaaS agreement, AI financial planning terms, data processing, GDPR, CCPA, SOC2',
}

export default function MasterSubscriptionAgreement() {
  const lastUpdated = "April 15, 2026"
  const effectiveDate = "April 15, 2026"

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-blue-100">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <ArrowLeft className="h-4 w-4 text-slate-500 group-hover:text-blue-600 transition-colors" />
            <span className="font-semibold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">FinaPilot</span>
          </Link>
          <div className="flex gap-4 text-sm font-medium">
            <span className="text-blue-600 border-b-2 border-blue-600 pb-5 pt-5">Terms of Service</span>
            <Link href="/legal/data-privacy-security" className="text-slate-500 hover:text-slate-900 transition-colors pb-5 pt-5">Privacy Policy</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        
        {/* Header Section */}
        <div className="space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold tracking-wide uppercase border border-blue-100">
            <Scale className="h-3.5 w-3.5" />
            Legal &amp; Compliance
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            Terms of Service
          </h1>
          <p className="text-lg text-slate-500 italic">Master Subscription Agreement</p>
          <p className="text-xl text-slate-600 max-w-2xl leading-relaxed">
            This agreement governs your acquisition and use of FinaPilot&apos;s AI-powered Financial Planning &amp; Analysis (FP&amp;A) enterprise cloud platform.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Last Updated: {lastUpdated}
            </div>
            <span className="hidden sm:inline text-slate-300">|</span>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Effective Date: {effectiveDate}
            </div>
          </div>
        </div>

        {/* Quick Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <Shield className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">Enterprise SLAs</h3>
            <p className="text-sm text-slate-600">Guaranteed 99.9% uptime with financially backed service-level credits and 24/7 support.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <FileText className="h-8 w-8 text-emerald-600 mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">Your Data, Your Property</h3>
            <p className="text-sm text-slate-600">You retain 100% ownership and intellectual property rights over all financial data and AI-generated outputs.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <Cpu className="h-8 w-8 text-purple-600 mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">AI Transparency</h3>
            <p className="text-sm text-slate-600">Zero-retention AI processing. Your data is never used to train public or multi-tenant models.</p>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 mb-16">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Table of Contents
          </h2>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {[
              "1. Definitions",
              "2. Scope of Services",
              "3. Subscription Terms & Access Rights",
              "4. Customer Responsibilities",
              "5. Fees, Payment & Taxes",
              "6. Artificial Intelligence Terms",
              "7. Data Ownership & Intellectual Property",
              "8. Confidentiality",
              "9. Data Security & Compliance",
              "10. Service Level Agreement (SLA)",
              "11. Support & Maintenance",
              "12. Acceptable Use Policy",
              "13. Representations & Warranties",
              "14. Disclaimer of Warranties",
              "15. Limitation of Liability",
              "16. Indemnification",
              "17. Term & Termination",
              "18. Data Portability & Post-Termination",
              "19. Force Majeure",
              "20. Governing Law & Dispute Resolution",
              "21. Export Controls & Sanctions",
              "22. Insurance",
              "23. Assignment & Subcontracting",
              "24. Notices",
              "25. Amendments & Waivers",
              "26. Entire Agreement & Severability",
            ].map((item) => (
              <a key={item} href={`#section-${item.split('.')[0]}`} className="text-slate-600 hover:text-blue-600 transition-colors py-1 border-b border-slate-100">
                {item}
              </a>
            ))}
          </div>
        </div>

        {/* Legal Text Content */}
        <article className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-blue-600 hover:prose-a:text-blue-500">
          
          <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100 mb-10">
            <p className="text-sm text-blue-900 m-0">
              <strong>IMPORTANT NOTICE:</strong> This Master Subscription Agreement (&ldquo;Agreement&rdquo; or &ldquo;Terms of Service&rdquo;) is a legally binding contract between FinaPilot Inc., a Delaware corporation (&ldquo;FinaPilot&rdquo;, &ldquo;Company&rdquo;, &ldquo;We&rdquo;, &ldquo;Us&rdquo;, or &ldquo;Our&rdquo;) and the entity or individual accessing or using the Services (&ldquo;Customer&rdquo;, &ldquo;You&rdquo;, or &ldquo;Your&rdquo;). By executing an Order Form that references this Agreement, by clicking &ldquo;I Accept,&rdquo; or by accessing or using the Services, you acknowledge that you have read, understood, and agree to be bound by this Agreement. If you are entering into this Agreement on behalf of an organization, you represent and warrant that you have the authority to bind that organization. <strong>If you do not agree to these terms, do not use the Services.</strong>
            </p>
          </div>

          {/* ============================================================ */}
          {/* SECTION 1: DEFINITIONS */}
          {/* ============================================================ */}
          <h2 id="section-1">1. Definitions</h2>
          <p>In this Agreement, the following capitalized terms have the meanings set forth below:</p>
          
          <p><strong>1.1 &ldquo;Affiliate&rdquo;</strong> means any entity that directly or indirectly controls, is controlled by, or is under common control with a party, where &ldquo;control&rdquo; means ownership of more than fifty percent (50%) of the voting securities.</p>
          
          <p><strong>1.2 &ldquo;Authorized Users&rdquo;</strong> means the individuals who are authorized by Customer to access and use the Cloud Services under the rights granted to Customer in this Agreement. Authorized Users may include Customer&apos;s employees, consultants, contractors, and agents, and third parties with whom Customer transacts business.</p>
          
          <p><strong>1.3 &ldquo;Cloud Services&rdquo;</strong> (or &ldquo;Services&rdquo; or &ldquo;Platform&rdquo;) means the FinaPilot Financial Planning &amp; Analysis platform, including but not limited to: financial modeling engines, variance analysis tools, board reporting modules, Monte Carlo simulation, scenario planning, investor dashboards, the AI-CFO assistant, predictive forecasting, budget-vs-actual analysis, and all related APIs, portals, and documentation made available by FinaPilot on a subscription basis.</p>
          
          <p><strong>1.4 &ldquo;Customer Data&rdquo;</strong> means all electronic data, information, content, and materials submitted, uploaded, or integrated by or on behalf of Customer or any Authorized User to or through the Cloud Services. Customer Data includes, without limitation, financial records, ledger data, ERP extracts, CRM data, payroll information, budget projections, and any other proprietary business information. Customer Data does not include Aggregated Anonymous Data.</p>
          
          <p><strong>1.5 &ldquo;AI Features&rdquo;</strong> means the artificial intelligence and machine learning capabilities integrated into the Cloud Services, including but not limited to: large language model (LLM) based narrative generation, automated insight detection, anomaly identification, natural language querying of financial data, AI-generated board report content, and predictive analytics powered by AI/ML algorithms.</p>
          
          <p><strong>1.6 &ldquo;Order Form&rdquo;</strong> means an ordering document or online enrollment form specifying the Cloud Services to be provided hereunder, the number of Authorized Users, the Subscription Term, applicable fees, and any other commercial terms mutually agreed upon by the parties. Each Order Form is incorporated into and governed by this Agreement.</p>
          
          <p><strong>1.7 &ldquo;Aggregated Anonymous Data&rdquo;</strong> means Customer Data that has been de-identified, aggregated, and anonymized such that it cannot, on its own or in combination with other data, be used to identify Customer or any individual. FinaPilot may use Aggregated Anonymous Data solely for the purposes of improving the Cloud Services, conducting industry benchmarking, and compiling statistical analyses.</p>
          
          <p><strong>1.8 &ldquo;Documentation&rdquo;</strong> means the user guides, online help, release notes, training materials, and other technical documentation made available by FinaPilot to explain the features and functionality of the Cloud Services.</p>
          
          <p><strong>1.9 &ldquo;Personal Data&rdquo;</strong> means any information relating to an identified or identifiable natural person as defined under applicable Data Protection Laws, including the GDPR, CCPA/CPRA, and other applicable privacy regulations.</p>
          
          <p><strong>1.10 &ldquo;Data Protection Laws&rdquo;</strong> means all applicable laws and regulations relating to the processing of Personal Data, including but not limited to: the General Data Protection Regulation (EU) 2016/679 (&ldquo;GDPR&rdquo;), the UK GDPR, the California Consumer Privacy Act as amended by the California Privacy Rights Act (&ldquo;CCPA/CPRA&rdquo;), the Virginia Consumer Data Protection Act (&ldquo;VCDPA&rdquo;), the Colorado Privacy Act (&ldquo;CPA&rdquo;), and any other applicable state, federal, or international privacy statutes.</p>
          
          <p><strong>1.11 &ldquo;Subscription Term&rdquo;</strong> means the period during which Customer has the right to access and use the Cloud Services, as specified in the applicable Order Form.</p>
          
          <p><strong>1.12 &ldquo;Service Level Agreement&rdquo; or &ldquo;SLA&rdquo;</strong> means the uptime and performance commitments set forth in Section 10 of this Agreement or in a separate SLA document referenced in the applicable Order Form.</p>


          {/* ============================================================ */}
          {/* SECTION 2: SCOPE OF SERVICES */}
          {/* ============================================================ */}
          <h2 id="section-2">2. Scope of Services</h2>
          
          <p><strong>2.1 Provision of Cloud Services.</strong> Subject to the terms of this Agreement and the applicable Order Form, FinaPilot shall make the Cloud Services available to Customer during the Subscription Term. The Cloud Services are provided as a multi-tenant software-as-a-service (SaaS) offering hosted on enterprise-grade cloud infrastructure.</p>
          
          <p><strong>2.2 Service Components.</strong> The Cloud Services may include, depending on the Customer&apos;s subscription tier:</p>
          <ul>
            <li><strong>Core Financial Modeling:</strong> Three-statement financial model generation, scenario planning, and sensitivity analysis.</li>
            <li><strong>Variance &amp; Budget Analysis:</strong> Automated budget-vs-actual comparison, variance waterfall analysis, and trend detection.</li>
            <li><strong>Board Reporting &amp; Investor Dashboards:</strong> Institutional-grade PPTX/PDF generation, KPI scorecards, and stakeholder distribution.</li>
            <li><strong>Monte Carlo Simulation:</strong> Probabilistic cash-flow forecasting and risk quantification.</li>
            <li><strong>AI-CFO Assistant:</strong> Natural language financial querying, narrative report generation, anomaly detection, and strategic recommendations.</li>
            <li><strong>Data Integrations:</strong> Connections to third-party accounting systems (e.g., QuickBooks, Xero, NetSuite), CRM platforms (e.g., Salesforce, HubSpot), HRIS systems, and flat-file uploads (CSV, Excel).</li>
            <li><strong>HyperBlock Engine:</strong> Computational cell-level provenance tracking, directed acyclic graph (DAG) dependency mapping, and data lineage visualization.</li>
            <li><strong>Collaboration &amp; Governance:</strong> Role-based access control (RBAC), approval workflows, audit trails, and multi-user commenting.</li>
          </ul>
          
          <p><strong>2.3 Modifications to Services.</strong> FinaPilot reserves the right to update, modify, or enhance the Cloud Services at any time. FinaPilot shall provide at least thirty (30) days&apos; written notice prior to any material change that would adversely affect the functionality available to Customer under an active Order Form. Non-material updates (bug fixes, UI improvements, minor feature additions) may be deployed without prior notice.</p>
          
          <p><strong>2.4 Beta Features.</strong> FinaPilot may, from time to time, offer access to beta or early-access features. Beta features are provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without any warranty, SLA, or support commitment. FinaPilot may discontinue beta features at any time without liability.</p>


          {/* ============================================================ */}
          {/* SECTION 3: SUBSCRIPTION TERMS & ACCESS */}
          {/* ============================================================ */}
          <h2 id="section-3">3. Subscription Terms &amp; Access Rights</h2>
          
          <p><strong>3.1 License Grant.</strong> Subject to Customer&apos;s compliance with this Agreement and timely payment of all applicable fees, FinaPilot grants Customer a non-exclusive, non-transferable, non-sublicensable (except to Authorized Users), limited right to access and use the Cloud Services during the Subscription Term, solely for Customer&apos;s internal business purposes.</p>
          
          <p><strong>3.2 Authorized Users.</strong> Customer shall ensure that each Authorized User complies with this Agreement. Customer is responsible for all activities that occur under its Authorized Users&apos; accounts and for maintaining the security and confidentiality of all login credentials. Customer shall promptly notify FinaPilot of any unauthorized access or use.</p>
          
          <p><strong>3.3 Subscription Tiers.</strong> Access to specific features and capacity limits shall be determined by Customer&apos;s subscription tier as specified in the applicable Order Form. Subscription tiers include, but are not limited to, Starter, Growth, Enterprise, and Enterprise Plus. Feature availability, user limits, storage quotas, API rate limits, and support levels vary by tier.</p>
          
          <p><strong>3.4 Usage Restrictions.</strong> Customer shall not, and shall not permit any Authorized User or third party to: (a) license, sublicense, sell, resell, transfer, assign, distribute, or otherwise commercially exploit the Cloud Services; (b) modify, adapt, or create derivative works based upon the Cloud Services; (c) reverse engineer, disassemble, decompile, or attempt to derive the source code of any part of the Cloud Services; (d) access the Cloud Services for the purpose of building a competing product or service; (e) use the Cloud Services to process data on behalf of any unrelated third party without FinaPilot&apos;s prior written consent; or (f) exceed the usage limits specified in the Order Form.</p>


          {/* ============================================================ */}
          {/* SECTION 4: CUSTOMER RESPONSIBILITIES */}
          {/* ============================================================ */}
          <h2 id="section-4">4. Customer Responsibilities</h2>
          
          <p><strong>4.1 Data Accuracy.</strong> Customer is solely responsible for the accuracy, quality, integrity, legality, reliability, and appropriateness of all Customer Data. FinaPilot does not audit, verify, or validate Customer Data for accuracy. Financial projections, forecasts, and AI-generated insights produced by the Cloud Services are based on the data provided by Customer and should not be solely relied upon for material business decisions without independent verification.</p>
          
          <p><strong>4.2 Compliance.</strong> Customer shall use the Cloud Services in compliance with all applicable laws and regulations, including Data Protection Laws, financial reporting standards, and anti-money-laundering regulations. Customer is responsible for obtaining all necessary consents, authorizations, and approvals required for the lawful submission of Customer Data to the Cloud Services.</p>
          
          <p><strong>4.3 Account Security.</strong> Customer shall implement and maintain appropriate security measures, including strong passwords, multi-factor authentication (where available), and access management controls. Customer shall promptly notify FinaPilot at <a href="mailto:security@finapilot.ai">security@finapilot.ai</a> of any known or suspected breach of security or unauthorized use of Customer&apos;s account.</p>
          
          <p><strong>4.4 Cooperation.</strong> Customer shall provide FinaPilot with reasonable cooperation, access, and information necessary for FinaPilot to perform its obligations under this Agreement, including timely responses to integration configuration requests and support inquiries.</p>


          {/* ============================================================ */}
          {/* SECTION 5: FEES, PAYMENT & TAXES */}
          {/* ============================================================ */}
          <h2 id="section-5">5. Fees, Payment &amp; Taxes</h2>
          
          <p><strong>5.1 Fees.</strong> Customer shall pay all fees specified in the applicable Order Form. Unless otherwise stated in the Order Form, fees are based on the subscription tier and the number of Authorized Users and are non-refundable, non-cancellable, and non-creditable. Fees are quoted in United States Dollars (USD) unless otherwise specified.</p>
          
          <p><strong>5.2 Payment Terms.</strong> Unless otherwise stated in the Order Form, invoices are due and payable within thirty (30) days of the invoice date. Payment shall be made by credit card, ACH transfer, or wire transfer as specified by FinaPilot. For annual subscriptions, fees are invoiced in advance for the applicable Subscription Term.</p>
          
          <p><strong>5.3 Overdue Payments.</strong> If any invoiced amount is not received by FinaPilot within fifteen (15) days after the due date, FinaPilot may, without limiting its other rights and remedies: (a) charge interest on the overdue amount at the rate of 1.5% per month (or the maximum rate permitted by law, whichever is lower); and (b) suspend Customer&apos;s access to the Cloud Services upon ten (10) days&apos; written notice until such amounts are paid in full.</p>
          
          <p><strong>5.4 Taxes.</strong> All fees are exclusive of applicable sales, use, VAT, GST, withholding, and other taxes. Customer is responsible for all such taxes, excluding taxes based on FinaPilot&apos;s net income. If FinaPilot is required to collect or pay taxes on Customer&apos;s behalf, such taxes will be invoiced to and paid by Customer.</p>
          
          <p><strong>5.5 Price Changes.</strong> FinaPilot may adjust fees for renewal Subscription Terms upon at least sixty (60) days&apos; written notice prior to the commencement of the renewal term. Any price increase shall not exceed ten percent (10%) of the prior term&apos;s fees unless otherwise agreed in writing.</p>


          {/* ============================================================ */}
          {/* SECTION 6: ARTIFICIAL INTELLIGENCE TERMS */}
          {/* ============================================================ */}
          <h2 id="section-6">6. Artificial Intelligence Terms</h2>
          
          <div className="bg-purple-50/50 rounded-xl p-6 border border-purple-100 mb-6 not-prose">
            <div className="flex items-start gap-3">
              <Cpu className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
              <p className="text-sm text-purple-900 m-0">
                <strong>AI Transparency Commitment.</strong> FinaPilot integrates artificial intelligence and machine learning capabilities into the Cloud Services. This section sets forth the specific terms governing the use of AI Features, data processing by AI systems, and the allocation of rights and responsibilities for AI-generated outputs. These terms are designed to meet or exceed standards established by leading enterprise FP&amp;A providers (e.g., Anaplan CoPlanner, Workday Adaptive Insights) and comply with the EU AI Act classification framework.
              </p>
            </div>
          </div>
          
          <p><strong>6.1 Scope of AI Features.</strong> AI Features within the Cloud Services include, without limitation: (a) AI-CFO natural language assistant for financial querying and strategic analysis; (b) automated executive summary and board narrative generation; (c) predictive revenue and expense forecasting; (d) anomaly detection and variance explanation; (e) scenario planning recommendations; and (f) data-driven KPI insights. AI Features are designed to augment, not replace, human financial judgment.</p>
          
          <p><strong>6.2 No Training on Customer Data.</strong> FinaPilot explicitly guarantees that Customer Data, prompts, queries, and AI-generated outputs will <strong>never</strong> be used to train, fine-tune, ground, distill, or improve: (a) any public or multi-tenant AI/ML model; (b) any third-party LLM provider&apos;s base model (e.g., OpenAI, Anthropic, Google); or (c) any FinaPilot general-purpose model available to other customers. This prohibition is absolute and survives termination of this Agreement.</p>
          
          <p><strong>6.3 AI Data Processing Architecture.</strong></p>
          <ul>
            <li><strong>Isolated Processing:</strong> Customer Data processed by AI Features is handled in logically isolated, ephemeral compute environments. No Customer Data is persisted in AI inference memory beyond the immediate request-response cycle.</li>
            <li><strong>Enterprise-Grade APIs:</strong> Where FinaPilot utilizes third-party AI infrastructure (e.g., Google Vertex AI, Azure OpenAI Service, AWS Bedrock), such processing occurs under enterprise agreements that contractually prohibit the provider from accessing, storing, or using Customer Data for any purpose other than fulfilling the specific API call.</li>
            <li><strong>Zero Telemetry:</strong> Customer Data submitted to AI Features is exempt from telemetry, usage analytics, and logging by third-party AI providers.</li>
          </ul>
          
          <p><strong>6.4 AI Output Ownership.</strong> Customer retains full ownership of all outputs generated by AI Features based on Customer Data, including executive summaries, board narratives, forecasts, variance explanations, and strategic recommendations (&ldquo;AI Outputs&rdquo;). FinaPilot claims no intellectual property rights in AI Outputs. Customer may use, reproduce, distribute, and create derivative works from AI Outputs without restriction.</p>
          
          <p><strong>6.5 AI Limitations and Disclaimers.</strong></p>
          <ul>
            <li><strong>Probabilistic Nature:</strong> AI Features produce probabilistic outputs. AI Outputs may contain inaccuracies, omissions, or fabricated information (&ldquo;hallucinations&rdquo;). Customer acknowledges that AI Outputs are not a substitute for professional financial advice, independent auditing, or human review.</li>
            <li><strong>No Fiduciary Duty:</strong> FinaPilot does not act as a financial advisor, auditor, or fiduciary. The Cloud Services, including AI Features, are informational tools only. Customer is solely responsible for verifying AI Outputs before relying on them for any business, regulatory, or investment decision.</li>
            <li><strong>Evolving Technology:</strong> AI technology is rapidly evolving. FinaPilot reserves the right to update, modify, or replace underlying AI models to improve quality and performance. Such changes shall not materially diminish the functionality described in the applicable Order Form.</li>
          </ul>
          
          <p><strong>6.6 Human-in-the-Loop.</strong> For any AI-generated content intended for external distribution (e.g., board reports, investor presentations, regulatory filings), Customer is responsible for implementing appropriate human review and approval processes prior to dissemination. FinaPilot shall not be liable for any damages arising from Customer&apos;s publication or distribution of unreviewed AI Outputs.</p>
          
          <p><strong>6.7 AI Ethics and Bias Mitigation.</strong> FinaPilot is committed to responsible AI practices. We conduct regular assessments of our AI models for bias, fairness, and accuracy. If Customer identifies any biased, discriminatory, or materially inaccurate AI Output, Customer may report it to <a href="mailto:ai-ethics@finapilot.ai">ai-ethics@finapilot.ai</a> for investigation and remediation.</p>
          
          <p><strong>6.8 Regulatory Compliance.</strong> FinaPilot shall use commercially reasonable efforts to ensure that AI Features comply with applicable laws, including the EU AI Act (Regulation (EU) 2024/1689) to the extent that the Cloud Services fall within its scope. FinaPilot classifies its AI Features as &ldquo;limited risk&rdquo; decision-support tools under the EU AI Act and provides transparency obligations accordingly.</p>


          {/* ============================================================ */}
          {/* SECTION 7: DATA OWNERSHIP & IP */}
          {/* ============================================================ */}
          <h2 id="section-7">7. Data Ownership &amp; Intellectual Property</h2>
          
          <p><strong>7.1 Customer Data Ownership.</strong> As between Customer and FinaPilot, Customer retains all right, title, and interest (including all intellectual property rights) in and to Customer Data. This Agreement does not grant FinaPilot any ownership interest in Customer Data.</p>
          
          <p><strong>7.2 License to Customer Data.</strong> Customer grants FinaPilot a non-exclusive, worldwide, royalty-free license to access, use, process, copy, transmit, store, and display Customer Data solely to the extent necessary to provide, maintain, and improve the Cloud Services, provide customer support, prevent or address technical issues, and comply with applicable law.</p>
          
          <p><strong>7.3 FinaPilot Intellectual Property.</strong> FinaPilot and its licensors retain all right, title, and interest in and to the Cloud Services, including all software, algorithms, models, user interfaces, APIs, architectures, designs, documentation, and all modifications, enhancements, and derivative works thereof. Nothing in this Agreement transfers or assigns any FinaPilot intellectual property rights to Customer.</p>
          
          <p><strong>7.4 Feedback.</strong> If Customer provides any suggestions, ideas, enhancement requests, or other feedback regarding the Cloud Services (&ldquo;Feedback&rdquo;), FinaPilot shall be free to use, disclose, reproduce, license, and otherwise exploit such Feedback without restriction or obligation to Customer.</p>
          
          <p><strong>7.5 Aggregated Anonymous Data.</strong> FinaPilot may create and use Aggregated Anonymous Data derived from Customer Data for the purposes of improving the Cloud Services, developing new features, conducting performance benchmarking, and publishing industry research. Aggregated Anonymous Data shall not identify Customer or any individual.</p>


          {/* ============================================================ */}
          {/* SECTION 8: CONFIDENTIALITY */}
          {/* ============================================================ */}
          <h2 id="section-8">8. Confidentiality</h2>
          
          <p><strong>8.1 Definition.</strong> &ldquo;Confidential Information&rdquo; means any non-public information disclosed by one party (&ldquo;Discloser&rdquo;) to the other (&ldquo;Recipient&rdquo;) that is designated as confidential or that a reasonable person would understand to be confidential given the nature of the information and the circumstances of disclosure. Confidential Information includes, without limitation: Customer Data, business plans, pricing, product roadmaps, technical specifications, security reports, financial records, and the terms of this Agreement.</p>
          
          <p><strong>8.2 Obligations.</strong> The Recipient shall: (a) protect the Discloser&apos;s Confidential Information using the same degree of care it uses to protect its own confidential information, but in no event less than reasonable care; (b) not use the Discloser&apos;s Confidential Information for any purpose other than performing its obligations or exercising its rights under this Agreement; and (c) not disclose the Discloser&apos;s Confidential Information to any third party except to its employees, agents, and contractors who have a need to know and are bound by confidentiality obligations at least as protective as those in this section.</p>
          
          <p><strong>8.3 Exceptions.</strong> Confidential Information does not include information that: (a) is or becomes publicly available through no fault of the Recipient; (b) was rightfully known by the Recipient prior to disclosure; (c) is independently developed by the Recipient without use of or reference to the Confidential Information; or (d) is rightfully obtained from a third party without restriction on disclosure.</p>
          
          <p><strong>8.4 Compelled Disclosure.</strong> If the Recipient is compelled by law, regulation, or judicial order to disclose Confidential Information, it shall, to the extent legally permitted, provide the Discloser with prompt written notice to allow the Discloser to seek a protective order.</p>
          
          <p><strong>8.5 Duration.</strong> Confidentiality obligations under this section shall survive termination or expiration of this Agreement for a period of five (5) years, or, with respect to trade secrets, for as long as such information qualifies as a trade secret under applicable law.</p>


          {/* ============================================================ */}
          {/* SECTION 9: DATA SECURITY & COMPLIANCE */}
          {/* ============================================================ */}
          <h2 id="section-9">9. Data Security &amp; Compliance</h2>
          
          <p><strong>9.1 Security Program.</strong> FinaPilot maintains a comprehensive Information Security Management System (ISMS) designed to protect Customer Data from unauthorized access, disclosure, alteration, or destruction. Our security program includes administrative, technical, and physical safeguards proportionate to the sensitivity of Customer Data.</p>
          
          <p><strong>9.2 Certifications &amp; Standards.</strong></p>
          <ul>
            <li><strong>SOC 2 Type II:</strong> FinaPilot undergoes annual independent SOC 2 Type II audits covering Security, Availability, Processing Integrity, Confidentiality, and Privacy trust service criteria. Audit reports are available to Enterprise customers under NDA upon request.</li>
            <li><strong>ISO 27001:</strong> FinaPilot&apos;s Information Security Management System is aligned with ISO/IEC 27001:2022 standards.</li>
            <li><strong>SOC 3:</strong> A publicly available SOC 3 report is available on our Trust Center.</li>
          </ul>
          
          <p><strong>9.3 Encryption.</strong></p>
          <ul>
            <li><strong>Data at Rest:</strong> All Customer Data stored in databases and file systems is encrypted using AES-256 block-level encryption.</li>
            <li><strong>Data in Transit:</strong> All data transmitted between Customer and the Cloud Services is encrypted using TLS 1.2 or TLS 1.3.</li>
            <li><strong>Key Management:</strong> Encryption keys are managed through industry-standard key management services (e.g., AWS KMS) with automatic key rotation.</li>
          </ul>
          
          <p><strong>9.4 Access Controls.</strong> FinaPilot enforces strict role-based access control (RBAC) for internal systems. Access to Customer Data by FinaPilot personnel is limited to those with a documented business need, is logged, and requires multi-factor authentication. FinaPilot employees undergo background checks and mandatory security awareness training.</p>
          
          <p><strong>9.5 Vulnerability Management.</strong> FinaPilot conducts continuous automated vulnerability scanning of its infrastructure and applications. Independent third-party penetration testing is performed at least annually. Critical vulnerabilities are remediated within established SLA timeframes.</p>
          
          <p><strong>9.6 Incident Response.</strong> FinaPilot maintains a documented Security Incident Response Plan. In the event of a confirmed security breach affecting Customer Data:</p>
          <ul>
            <li>FinaPilot shall notify Customer without undue delay and in no event later than seventy-two (72) hours after becoming aware of the breach.</li>
            <li>Notification shall include: the nature of the breach, categories of data affected, estimated number of records impacted, likely consequences, and measures taken or proposed to mitigate the breach.</li>
            <li>FinaPilot shall cooperate with Customer&apos;s investigation and remediation efforts.</li>
          </ul>
          
          <p><strong>9.7 Data Processing Agreement (DPA).</strong> To the extent that FinaPilot processes Personal Data on behalf of Customer, the parties shall execute a Data Processing Agreement (or &ldquo;Data Processing Addendum&rdquo;) that complies with the requirements of applicable Data Protection Laws. The DPA, when executed, is incorporated into and forms part of this Agreement. FinaPilot acts as a &ldquo;Data Processor&rdquo; (or &ldquo;Service Provider&rdquo; under CCPA) with respect to Customer Personal Data.</p>


          {/* ============================================================ */}
          {/* SECTION 10: SLA */}
          {/* ============================================================ */}
          <h2 id="section-10">10. Service Level Agreement (SLA)</h2>
          
          <p><strong>10.1 Uptime Commitment.</strong> FinaPilot shall use commercially reasonable efforts to maintain a Monthly Uptime Percentage of at least <strong>99.9%</strong> for the Cloud Services during each calendar month. &ldquo;Monthly Uptime Percentage&rdquo; is calculated as: ((Total Minutes in Month &minus; Downtime Minutes) / Total Minutes in Month) &times; 100.</p>
          
          <p><strong>10.2 Exclusions.</strong> Downtime caused by the following shall not count toward any SLA calculation: (a) scheduled maintenance communicated at least forty-eight (48) hours in advance; (b) factors outside FinaPilot&apos;s reasonable control, including force majeure events, Internet access disruptions, and acts of third parties; (c) Customer&apos;s equipment, software, or third-party applications; (d) Customer&apos;s breach of this Agreement; or (e) beta features.</p>
          
          <p><strong>10.3 Service Credits.</strong> If FinaPilot fails to meet the Monthly Uptime Percentage, Customer may request service credits as follows:</p>
          <ul>
            <li>99.0% &ndash; 99.9%: Credit equal to 10% of the monthly fee for the affected month.</li>
            <li>95.0% &ndash; 98.9%: Credit equal to 25% of the monthly fee for the affected month.</li>
            <li>Below 95.0%: Credit equal to 50% of the monthly fee for the affected month.</li>
          </ul>
          <p>Service credits are Customer&apos;s sole and exclusive remedy for FinaPilot&apos;s failure to meet the SLA. Credits must be requested in writing within thirty (30) days of the month in which the downtime occurred. Credits shall not exceed 50% of the total monthly fee and may not be redeemed for cash.</p>


          {/* ============================================================ */}
          {/* SECTION 11: SUPPORT */}
          {/* ============================================================ */}
          <h2 id="section-11">11. Support &amp; Maintenance</h2>
          
          <p><strong>11.1 Standard Support.</strong> All subscription tiers include access to FinaPilot&apos;s online knowledge base, community forums, and email-based technical support during business hours (9:00 AM &ndash; 6:00 PM EST, Monday through Friday, excluding U.S. federal holidays).</p>
          
          <p><strong>11.2 Enterprise Support.</strong> Customers on Enterprise and Enterprise Plus tiers receive:</p>
          <ul>
            <li>24/7/365 critical incident support with a one (1) hour response time for Severity 1 issues.</li>
            <li>A dedicated Customer Success Manager (CSM).</li>
            <li>Quarterly business reviews and proactive health checks.</li>
            <li>Priority access to new features and beta programs.</li>
          </ul>
          
          <p><strong>11.3 Maintenance.</strong> FinaPilot shall perform routine maintenance to ensure the optimal performance and security of the Cloud Services. Scheduled maintenance windows will be communicated in advance via email and the FinaPilot status page. Emergency maintenance to address critical security vulnerabilities may be performed without prior notice.</p>


          {/* ============================================================ */}
          {/* SECTION 12: ACCEPTABLE USE POLICY */}
          {/* ============================================================ */}
          <h2 id="section-12">12. Acceptable Use Policy</h2>
          
          <p><strong>12.1 Prohibited Conduct.</strong> Customer and its Authorized Users shall not use the Cloud Services to:</p>
          <ul>
            <li>Upload, transmit, or store any content that is unlawful, defamatory, threatening, abusive, harassing, or that infringes upon the intellectual property rights of any third party.</li>
            <li>Distribute malware, viruses, worms, trojan horses, or any other malicious code or technology.</li>
            <li>Attempt to gain unauthorized access to any other user&apos;s account, the Cloud Services infrastructure, or FinaPilot&apos;s internal systems.</li>
            <li>Engage in any activity that interferes with, disrupts, or places an unreasonable burden on the Cloud Services or its underlying infrastructure.</li>
            <li>Use the Cloud Services for cryptocurrency mining, illegal financial activities, money laundering, or any purpose that violates applicable anti-corruption or sanctions laws.</li>
            <li>Use the AI Features to generate content that is fraudulent, misleading, or designed to deceive investors, regulators, or other stakeholders.</li>
            <li>Scrape, crawl, or use automated means to extract data from the Cloud Services beyond the intended API functionality.</li>
            <li>Benchmark, test, or evaluate the Cloud Services for the purpose of developing a competing product or service.</li>
          </ul>
          
          <p><strong>12.2 Enforcement.</strong> FinaPilot reserves the right to investigate and take appropriate action against any violation of this Acceptable Use Policy, including suspending or terminating Customer&apos;s access without notice in the event of a material or repeated violation.</p>


          {/* ============================================================ */}
          {/* SECTION 13: WARRANTIES */}
          {/* ============================================================ */}
          <h2 id="section-13">13. Representations &amp; Warranties</h2>
          
          <p><strong>13.1 Mutual Warranties.</strong> Each party represents and warrants that: (a) it has the legal power and authority to enter into this Agreement; (b) this Agreement is duly authorized and constitutes a valid and binding obligation; (c) its performance of this Agreement does not conflict with any other agreement to which it is a party.</p>
          
          <p><strong>13.2 FinaPilot Warranties.</strong> FinaPilot represents and warrants that: (a) the Cloud Services shall perform materially in accordance with the applicable Documentation during the Subscription Term; (b) it will not materially diminish the overall security posture of the Cloud Services during the Subscription Term; (c) it will provide the Cloud Services in compliance with all applicable laws; and (d) it has and will maintain all necessary rights, licenses, and consents to provide the Cloud Services.</p>
          
          <p><strong>13.3 Remedy for Breach of Warranty.</strong> If the Cloud Services fail to conform to the warranty in Section 13.2(a), FinaPilot shall, at its option and expense, either: (a) correct the non-conforming Cloud Services; or (b) if FinaPilot is unable to correct the non-conformance within thirty (30) days of receipt of written notice from Customer, terminate the applicable Order Form and refund to Customer any prepaid fees covering the remainder of the Subscription Term. This is Customer&apos;s sole and exclusive remedy for breach of the warranty in Section 13.2(a).</p>


          {/* ============================================================ */}
          {/* SECTION 14: DISCLAIMER */}
          {/* ============================================================ */}
          <h2 id="section-14">14. Disclaimer of Warranties</h2>
          
          <div className="bg-amber-50/50 rounded-xl p-6 border border-amber-200 mb-6 not-prose">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-900 m-0 uppercase font-semibold tracking-wide">
                EXCEPT FOR THE EXPRESS WARRANTIES SET FORTH IN SECTION 13, THE CLOUD SERVICES, AI FEATURES, AI OUTPUTS, DOCUMENTATION, AND ALL RELATED COMPONENTS ARE PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE.&rdquo; FINAPILOT HEREBY DISCLAIMS ALL OTHER WARRANTIES, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING WITHOUT LIMITATION ALL IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, AND ANY WARRANTIES ARISING OUT OF COURSE OF DEALING, USAGE, OR TRADE PRACTICE. FINAPILOT DOES NOT WARRANT THAT THE CLOUD SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE, OR THAT ALL DEFECTS WILL BE CORRECTED. FINAPILOT DOES NOT WARRANT THE ACCURACY, COMPLETENESS, OR RELIABILITY OF ANY AI OUTPUT. AI FEATURES UTILIZE PROBABILISTIC MACHINE LEARNING MODELS THAT MAY PRODUCE INACCURATE OR UNEXPECTED RESULTS. CUSTOMER ASSUMES ALL RISK ARISING FROM ITS USE OF AND RELIANCE UPON ANY AI OUTPUT.
              </p>
            </div>
          </div>


          {/* ============================================================ */}
          {/* SECTION 15: LIMITATION OF LIABILITY */}
          {/* ============================================================ */}
          <h2 id="section-15">15. Limitation of Liability</h2>
          
          <p><strong>15.1 Exclusion of Consequential Damages.</strong> TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL EITHER PARTY BE LIABLE TO THE OTHER PARTY FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF PROFITS, REVENUE, GOODWILL, DATA, BUSINESS INTERRUPTION, OR COST OF PROCURING SUBSTITUTE SERVICES, REGARDLESS OF THE THEORY OF LIABILITY (CONTRACT, TORT, STRICT LIABILITY, OR OTHERWISE) AND EVEN IF THE PARTY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</p>
          
          <p><strong>15.2 Aggregate Liability Cap.</strong> EXCEPT FOR THE UNCAPPED LIABILITIES SET FORTH IN SECTION 15.3, EACH PARTY&apos;S TOTAL CUMULATIVE LIABILITY ARISING OUT OF OR RELATED TO THIS AGREEMENT SHALL NOT EXCEED THE TOTAL FEES PAID OR PAYABLE BY CUSTOMER TO FINAPILOT DURING THE TWELVE (12) MONTH PERIOD IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM.</p>
          
          <p><strong>15.3 Uncapped Liabilities.</strong> The limitations in Sections 15.1 and 15.2 shall not apply to: (a) either party&apos;s breach of confidentiality obligations (Section 8); (b) FinaPilot&apos;s breach of its AI data processing obligations (Section 6.2); (c) either party&apos;s indemnification obligations (Section 16); (d) Customer&apos;s payment obligations; (e) liability arising from a party&apos;s willful misconduct or gross negligence; or (f) liability that cannot be limited or excluded by applicable law.</p>
          
          <p><strong>15.4 Basis of the Bargain.</strong> Each party acknowledges that the limitations of liability set forth in this Section reflect the allocation of risk between the parties and form an essential basis of the bargain between them. Neither party would have entered into this Agreement without these limitations of liability.</p>


          {/* ============================================================ */}
          {/* SECTION 16: INDEMNIFICATION */}
          {/* ============================================================ */}
          <h2 id="section-16">16. Indemnification</h2>
          
          <p><strong>16.1 FinaPilot Indemnification.</strong> FinaPilot shall defend, indemnify, and hold harmless Customer and its officers, directors, employees, and agents from and against any third-party claims, actions, demands, damages, liabilities, costs, and expenses (including reasonable attorneys&apos; fees) alleging that Customer&apos;s authorized use of the Cloud Services infringes or misappropriates any valid third-party patent, copyright, trademark, or trade secret (&ldquo;IP Claim&rdquo;).</p>
          
          <p><strong>16.2 Infringement Remedies.</strong> If the Cloud Services become, or in FinaPilot&apos;s reasonable opinion are likely to become, the subject of an IP Claim, FinaPilot may, at its option and expense: (a) procure the right for Customer to continue using the Cloud Services; (b) replace or modify the Cloud Services so they become non-infringing while remaining functionally equivalent; or (c) if neither (a) nor (b) is commercially practicable, terminate the applicable Order Form and refund any prepaid fees for the unused portion of the Subscription Term.</p>
          
          <p><strong>16.3 Customer Indemnification.</strong> Customer shall defend, indemnify, and hold harmless FinaPilot and its officers, directors, employees, and agents from and against any third-party claims arising out of: (a) Customer Data or Customer&apos;s use of the Cloud Services in violation of this Agreement; (b) any allegation that Customer Data infringes or misappropriates any third-party intellectual property right; or (c) Customer&apos;s violation of applicable laws.</p>
          
          <p><strong>16.4 Indemnification Procedures.</strong> The indemnified party shall: (a) provide prompt written notice of the claim; (b) grant the indemnifying party sole control over the defense and settlement of the claim; and (c) provide reasonable cooperation at the indemnifying party&apos;s expense. The indemnified party may participate in the defense at its own expense. The indemnifying party shall not settle any claim in a manner that admits liability or imposes obligations on the indemnified party without the indemnified party&apos;s prior written consent.</p>


          {/* ============================================================ */}
          {/* SECTION 17: TERM & TERMINATION */}
          {/* ============================================================ */}
          <h2 id="section-17">17. Term &amp; Termination</h2>
          
          <p><strong>17.1 Term.</strong> This Agreement commences on the date Customer first accepts it (or on the effective date of the first Order Form, whichever is earlier) and continues until all Order Forms have expired or been terminated.</p>
          
          <p><strong>17.2 Subscription Renewal.</strong> Unless otherwise specified in the Order Form, Subscription Terms shall automatically renew for additional periods equal to the expiring Subscription Term (or one (1) year, whichever is shorter), unless either party provides written notice of non-renewal at least thirty (30) days prior to the end of the then-current Subscription Term.</p>
          
          <p><strong>17.3 Termination for Cause.</strong> Either party may terminate this Agreement or any Order Form: (a) upon thirty (30) days&apos; written notice if the other party commits a material breach of this Agreement and fails to cure such breach within the notice period; or (b) immediately upon written notice if the other party becomes insolvent, files for bankruptcy, or ceases operations.</p>
          
          <p><strong>17.4 Termination for Convenience.</strong> Customer may terminate a monthly subscription at any time upon thirty (30) days&apos; written notice. For annual subscriptions, early termination fees may apply as specified in the applicable Order Form.</p>
          
          <p><strong>17.5 Effect of Termination.</strong> Upon termination or expiration: (a) Customer&apos;s access to the Cloud Services shall immediately cease (subject to the data portability period in Section 18); (b) each party shall return or destroy all Confidential Information of the other party; (c) all fees owed shall become immediately due and payable; and (d) the following sections shall survive: 1 (Definitions), 6.2 (No Training on Customer Data), 7 (Data Ownership &amp; IP), 8 (Confidentiality), 14 (Disclaimer), 15 (Limitation of Liability), 16 (Indemnification), 18 (Data Portability), 20 (Governing Law), and 26 (Entire Agreement).</p>


          {/* ============================================================ */}
          {/* SECTION 18: DATA PORTABILITY */}
          {/* ============================================================ */}
          <h2 id="section-18">18. Data Portability &amp; Post-Termination</h2>
          
          <p><strong>18.1 No Lock-In.</strong> FinaPilot asserts no proprietary lock-in over Customer Data. Upon termination or expiration of the Subscription Term, Customer shall have a thirty (30) day transition period during which Customer may export all Customer Data in standard, machine-readable formats including CSV, JSON, and Excel.</p>
          
          <p><strong>18.2 Data Deletion.</strong> Following the thirty (30) day transition period, FinaPilot shall permanently and irreversibly delete all Customer Data from production systems, including all copies, backups, and disaster recovery replicas, within an additional thirty (30) days. FinaPilot shall provide written certification of deletion upon Customer&apos;s request.</p>
          
          <p><strong>18.3 Exceptions.</strong> FinaPilot may retain Customer Data (or portions thereof) only to the extent required by applicable law, regulation, or legal process, and solely for the period required by such obligation. Any retained data shall continue to be protected in accordance with the confidentiality and security provisions of this Agreement.</p>
          
          <p><strong>18.4 Aggregated Anonymous Data.</strong> For the avoidance of doubt, Aggregated Anonymous Data (as defined in Section 1.7) is not subject to the deletion obligations in Section 18.2 and may be retained by FinaPilot indefinitely.</p>


          {/* ============================================================ */}
          {/* SECTION 19: FORCE MAJEURE */}
          {/* ============================================================ */}
          <h2 id="section-19">19. Force Majeure</h2>
          
          <p><strong>19.1</strong> Neither party shall be liable for any failure or delay in performing its obligations under this Agreement (other than payment obligations) to the extent such failure or delay results from circumstances beyond the party&apos;s reasonable control, including but not limited to: acts of God, natural disasters, epidemic or pandemic, war, terrorism, riots, government actions, sanctions, embargoes, fire, flood, power outages, Internet or telecommunications failures, cyberattacks on third-party infrastructure, or labor disputes (&ldquo;Force Majeure Event&rdquo;).</p>
          
          <p><strong>19.2</strong> The affected party shall provide prompt written notice describing the nature and expected duration of the Force Majeure Event and shall use reasonable efforts to mitigate its impact. If a Force Majeure Event continues for more than sixty (60) consecutive days, either party may terminate the affected Order Form upon written notice, and Customer shall receive a pro-rata refund of prepaid fees for the remaining Subscription Term.</p>


          {/* ============================================================ */}
          {/* SECTION 20: GOVERNING LAW */}
          {/* ============================================================ */}
          <h2 id="section-20">20. Governing Law &amp; Dispute Resolution</h2>
          
          <p><strong>20.1 Governing Law.</strong> This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law principles.</p>
          
          <p><strong>20.2 Dispute Resolution.</strong> Any dispute arising out of or relating to this Agreement shall be resolved as follows:</p>
          <ul>
            <li><strong>Informal Negotiation:</strong> The parties shall first attempt to resolve the dispute through good-faith negotiation between senior executives for a period of thirty (30) days.</li>
            <li><strong>Mediation:</strong> If negotiation fails, either party may initiate mediation administered by a mutually agreed-upon mediator or, failing agreement, by the American Arbitration Association (&ldquo;AAA&rdquo;) under its Commercial Mediation Procedures.</li>
            <li><strong>Arbitration:</strong> If mediation fails, the dispute shall be resolved by binding arbitration administered by the AAA under its Commercial Arbitration Rules. The arbitration shall be conducted by a single arbitrator in Wilmington, Delaware. The arbitrator&apos;s decision shall be final and binding, and judgment upon the award may be entered in any court of competent jurisdiction.</li>
          </ul>
          
          <p><strong>20.3 Injunctive Relief.</strong> Notwithstanding the foregoing, either party may seek injunctive or other equitable relief in any court of competent jurisdiction to prevent irreparable harm pending the outcome of arbitration, particularly with respect to breaches of confidentiality, intellectual property, or data security obligations.</p>
          
          <p><strong>20.4 Class Action Waiver.</strong> EACH PARTY AGREES THAT ANY DISPUTE RESOLUTION PROCEEDINGS WILL BE CONDUCTED ON AN INDIVIDUAL BASIS AND NOT AS A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION.</p>


          {/* ============================================================ */}
          {/* SECTION 21: EXPORT CONTROLS */}
          {/* ============================================================ */}
          <h2 id="section-21">21. Export Controls &amp; Sanctions</h2>
          
          <p><strong>21.1</strong> The Cloud Services may be subject to export control and sanctions laws of the United States and other jurisdictions. Customer shall not, directly or indirectly, export, re-export, or transfer the Cloud Services or any related technical data to any country, entity, or person in violation of applicable export control laws, including the U.S. Export Administration Regulations (EAR), the International Traffic in Arms Regulations (ITAR), or sanctions administered by the Office of Foreign Assets Control (OFAC).</p>
          
          <p><strong>21.2</strong> Customer represents and warrants that: (a) it is not located in, and is not a national or resident of, any country subject to comprehensive U.S. sanctions (currently Cuba, Iran, North Korea, Syria, and the Crimea, Donetsk, and Luhansk regions); (b) it is not listed on any U.S. government list of prohibited or restricted parties; and (c) it will not use the Cloud Services in connection with the design, development, production, or use of nuclear, chemical, or biological weapons or missiles.</p>


          {/* ============================================================ */}
          {/* SECTION 22: INSURANCE */}
          {/* ============================================================ */}
          <h2 id="section-22">22. Insurance</h2>
          
          <p><strong>22.1</strong> FinaPilot shall maintain, at its own expense, the following minimum insurance coverages during the term of this Agreement:</p>
          <ul>
            <li><strong>Commercial General Liability:</strong> Not less than $1,000,000 per occurrence and $2,000,000 in the aggregate.</li>
            <li><strong>Technology Errors &amp; Omissions (E&amp;O) / Cyber Liability:</strong> Not less than $5,000,000 per claim and in the aggregate, covering technology errors, data breaches, and cyber incidents.</li>
            <li><strong>Workers&apos; Compensation:</strong> As required by applicable law.</li>
          </ul>
          <p>FinaPilot shall provide certificates of insurance upon Customer&apos;s reasonable request.</p>


          {/* ============================================================ */}
          {/* SECTION 23: ASSIGNMENT */}
          {/* ============================================================ */}
          <h2 id="section-23">23. Assignment &amp; Subcontracting</h2>
          
          <p><strong>23.1 Assignment.</strong> Neither party may assign or transfer this Agreement, in whole or in part, without the prior written consent of the other party, such consent not to be unreasonably withheld. Notwithstanding the foregoing, either party may assign this Agreement without consent in connection with a merger, acquisition, corporate reorganization, or sale of all or substantially all of its assets, provided the successor entity assumes all obligations under this Agreement.</p>
          
          <p><strong>23.2 Subcontracting.</strong> FinaPilot may engage subcontractors and subprocessors to perform its obligations under this Agreement, provided that FinaPilot remains responsible for the acts and omissions of its subcontractors and ensures that subcontractors are bound by obligations no less protective than those in this Agreement.</p>


          {/* ============================================================ */}
          {/* SECTION 24: NOTICES */}
          {/* ============================================================ */}
          <h2 id="section-24">24. Notices</h2>
          
          <p><strong>24.1</strong> All notices required or permitted under this Agreement shall be in writing and shall be deemed delivered: (a) upon personal delivery; (b) upon confirmation of receipt when sent by email to the designated contact; (c) one (1) business day after deposit with a nationally recognized overnight courier service; or (d) three (3) business days after being sent by certified mail, return receipt requested.</p>
          
          <p><strong>24.2</strong> Notices to FinaPilot shall be sent to:</p>
          <ul>
            <li><strong>Legal Department:</strong> <a href="mailto:legal@finapilot.ai">legal@finapilot.ai</a></li>
            <li><strong>Security Incidents:</strong> <a href="mailto:security@finapilot.ai">security@finapilot.ai</a></li>
            <li><strong>Privacy/DPO:</strong> <a href="mailto:privacy@finapilot.ai">privacy@finapilot.ai</a></li>
          </ul>
          <p>Notices to Customer shall be sent to the email address associated with Customer&apos;s account or as specified in the applicable Order Form.</p>


          {/* ============================================================ */}
          {/* SECTION 25: AMENDMENTS */}
          {/* ============================================================ */}
          <h2 id="section-25">25. Amendments &amp; Waivers</h2>
          
          <p><strong>25.1 Amendments.</strong> FinaPilot may update this Agreement from time to time. Material changes will be communicated to Customer via email or in-platform notification at least thirty (30) days prior to the changes taking effect. Customer&apos;s continued use of the Cloud Services after the effective date of such changes constitutes acceptance. If Customer does not agree to the updated terms, Customer may terminate the affected subscription by providing written notice to FinaPilot before the changes take effect.</p>
          
          <p><strong>25.2 Waivers.</strong> The failure of either party to enforce any provision of this Agreement shall not constitute a waiver of that provision or the right to enforce it at a later time. All waivers must be in writing and signed by an authorized representative of the waiving party.</p>


          {/* ============================================================ */}
          {/* SECTION 26: ENTIRE AGREEMENT */}
          {/* ============================================================ */}
          <h2 id="section-26">26. Entire Agreement &amp; Severability</h2>
          
          <p><strong>26.1 Entire Agreement.</strong> This Agreement, together with all Order Forms, the Data Processing Agreement, the SLA, and any other documents expressly incorporated by reference, constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior or contemporaneous understandings, agreements, representations, and warranties, whether written or oral.</p>
          
          <p><strong>26.2 Order of Precedence.</strong> In the event of a conflict between the terms of this Agreement and an Order Form, the Order Form shall prevail with respect to the specific services and commercial terms covered therein. In the event of a conflict between this Agreement and the DPA, the DPA shall prevail with respect to data protection matters.</p>
          
          <p><strong>26.3 Severability.</strong> If any provision of this Agreement is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, such provision shall be modified to the minimum extent necessary to make it valid and enforceable, and the remaining provisions shall continue in full force and effect.</p>
          
          <p><strong>26.4 Relationship of the Parties.</strong> The relationship between FinaPilot and Customer is that of independent contractors. Nothing in this Agreement creates a partnership, joint venture, employment relationship, or agency relationship between the parties.</p>
          
          <p><strong>26.5 Third-Party Beneficiaries.</strong> This Agreement does not confer any rights or remedies upon any person or entity other than the parties hereto and their permitted successors and assigns.</p>
          
          <p><strong>26.6 Counterparts.</strong> Order Forms and amendments to this Agreement may be executed in counterparts, each of which shall be deemed an original and all of which together constitute one and the same instrument. Electronic signatures shall be deemed original signatures for all purposes.</p>

        </article>

        {/* Contact Section */}
        <div className="mt-16 bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Questions About Our Terms?</h3>
          <p className="text-sm text-slate-600 mb-6">
            If you have any questions regarding this Agreement, or if you require a negotiated enterprise agreement, please contact our legal team.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
              <Gavel className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">Legal Department</p>
                <a href="mailto:legal@finapilot.ai" className="text-blue-600 hover:text-blue-800">legal@finapilot.ai</a>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
              <Lock className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">Data Protection Officer</p>
                <a href="mailto:privacy@finapilot.ai" className="text-emerald-600 hover:text-emerald-800">privacy@finapilot.ai</a>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
              <Shield className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">Security Team</p>
                <a href="mailto:security@finapilot.ai" className="text-purple-600 hover:text-purple-800">security@finapilot.ai</a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-12 pt-8 border-t border-slate-200 text-sm text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>&copy; {new Date().getFullYear()} FinaPilot Inc. All rights reserved. Registered in Delaware, USA.</p>
          <div className="flex gap-4">
            <Link href="/legal/data-privacy-security" className="text-blue-600 hover:text-blue-800">Privacy Policy</Link>
            <span className="text-slate-300">|</span>
            <a href="mailto:legal@finapilot.ai" className="text-blue-600 hover:text-blue-800">legal@finapilot.ai</a>
          </div>
        </div>
      </main>
    </div>
  )
}
