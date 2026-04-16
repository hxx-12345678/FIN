import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Lock, Globe, Server, Database, EyeOff, Shield, Clock, FileText, Cpu, Cookie, Bell, Users, Eye, Trash2, Mail, MapPin, Settings, Fingerprint, Baby, ExternalLink, RefreshCw, Scale } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy | FinaPilot',
  description: 'Comprehensive Privacy Policy for FinaPilot — covering data collection, AI processing, cookies, GDPR/CCPA rights, international transfers, and enterprise data security. SOC 2 Type II certified.',
  keywords: 'FinaPilot privacy policy, data privacy, GDPR, CCPA, CPRA, AI data processing, financial data security, SOC2, cookie policy',
}

export default function DataPrivacySecurity() {
  const lastUpdated = "April 15, 2026"
  const effectiveDate = "April 15, 2026"

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-emerald-100">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <ArrowLeft className="h-4 w-4 text-slate-500 group-hover:text-emerald-600 transition-colors" />
            <span className="font-semibold text-slate-900 tracking-tight group-hover:text-emerald-600 transition-colors">FinaPilot</span>
          </Link>
          <div className="flex gap-4 text-sm font-medium">
            <Link href="/legal/master-subscription-agreement" className="text-slate-500 hover:text-slate-900 transition-colors pb-5 pt-5">Terms of Service</Link>
            <span className="text-emerald-600 border-b-2 border-emerald-600 pb-5 pt-5">Privacy Policy</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        
        {/* Header Section */}
        <div className="space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold tracking-wide uppercase border border-emerald-100">
            <Lock className="h-3.5 w-3.5" />
            Privacy &amp; Data Protection
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl leading-relaxed">
            Your privacy is fundamental to our mission. This Policy explains how FinaPilot collects, uses, shares, and protects your information when you use our AI-powered Financial Planning &amp; Analysis platform.
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
            <EyeOff className="h-8 w-8 text-emerald-600 mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">Zero-Access Architecture</h3>
            <p className="text-sm text-slate-600">Strict RBAC controls. FinaPilot employees cannot view your financial data without explicit, time-boxed consent.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <Cpu className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">AI Data Promise</h3>
            <p className="text-sm text-slate-600">We never use your data to train AI models. Your prompts and outputs are ephemeral and never shared.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <Globe className="h-8 w-8 text-purple-600 mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">Global Compliance</h3>
            <p className="text-sm text-slate-600">Full GDPR, CCPA/CPRA, VCDPA, and CPA compliance with formal Data Processing Addendums available.</p>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 mb-16">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            Table of Contents
          </h2>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {[
              "1. Introduction & Scope",
              "2. Information We Collect",
              "3. How We Use Your Information",
              "4. Artificial Intelligence & Data Processing",
              "5. Cookies & Tracking Technologies",
              "6. How We Share Your Information",
              "7. Data Retention",
              "8. Data Security",
              "9. International Data Transfers",
              "10. Your Privacy Rights (GDPR)",
              "11. Your Privacy Rights (CCPA/CPRA)",
              "12. State-Specific Privacy Rights (US)",
              "13. Children's Privacy",
              "14. Third-Party Links & Integrations",
              "15. Do Not Track / Global Privacy Control",
              "16. Data Processing Agreement",
              "17. Subprocessors",
              "18. Changes to This Policy",
              "19. Contact Us",
            ].map((item) => (
              <a key={item} href={`#privacy-${item.split('.')[0]}`} className="text-slate-600 hover:text-emerald-600 transition-colors py-1 border-b border-slate-100">
                {item}
              </a>
            ))}
          </div>
        </div>

        {/* Legal Text Content */}
        <article className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-emerald-600 hover:prose-a:text-emerald-500">
          
          <div className="bg-emerald-50/50 rounded-xl p-6 border border-emerald-100 mb-10">
            <p className="text-sm text-emerald-900 m-0 leading-relaxed">
              At FinaPilot, we recognize that our customers entrust us with their most sensitive financial data. This Privacy Policy is written in plain language to ensure transparency about our data practices. It applies to all users of the FinaPilot platform, website (finapilot.ai), and related services. By using our Services, you acknowledge that you have read and understood this Privacy Policy. This Privacy Policy should be read in conjunction with our <Link href="/legal/master-subscription-agreement" className="text-emerald-700 underline font-semibold">Terms of Service</Link>.
            </p>
          </div>


          {/* ============================================================ */}
          {/* SECTION 1: INTRODUCTION & SCOPE */}
          {/* ============================================================ */}
          <h2 id="privacy-1">1. Introduction &amp; Scope</h2>
          
          <p><strong>1.1 Who We Are.</strong> FinaPilot Inc. (&ldquo;FinaPilot,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is a Delaware corporation that provides an AI-powered Financial Planning &amp; Analysis (FP&amp;A) platform for businesses. Our registered address is available upon request at <a href="mailto:legal@finapilot.ai">legal@finapilot.ai</a>.</p>
          
          <p><strong>1.2 What This Policy Covers.</strong> This Privacy Policy applies to:</p>
          <ul>
            <li>Our marketing website at <strong>finapilot.ai</strong> (the &ldquo;Website&rdquo;).</li>
            <li>The FinaPilot cloud platform and all related applications, APIs, and integrations (the &ldquo;Platform&rdquo; or &ldquo;Cloud Services&rdquo;).</li>
            <li>All communications, support interactions, and related services provided by FinaPilot.</li>
          </ul>
          
          <p><strong>1.3 Our Dual Role.</strong> Depending on the type of data, FinaPilot acts in different capacities:</p>
          <ul>
            <li><strong>Data Controller:</strong> For Account Data, Website Visitor Data, and marketing data — we determine the purposes and means of processing.</li>
            <li><strong>Data Processor (Service Provider):</strong> For Customer Financial Data uploaded to the Platform — we process data solely on behalf of and under the instructions of the Enterprise Customer (the Controller). Our processing of Customer Financial Data is governed by our Data Processing Agreement (DPA).</li>
          </ul>


          {/* ============================================================ */}
          {/* SECTION 2: INFORMATION WE COLLECT */}
          {/* ============================================================ */}
          <h2 id="privacy-2">2. Information We Collect</h2>
          
          <p>We collect information in the following categories:</p>
          
          <h3>2.1 Information You Provide Directly</h3>
          
          <div className="overflow-x-auto not-prose mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-3 font-semibold text-slate-900 border border-slate-200">Category</th>
                  <th className="text-left p-3 font-semibold text-slate-900 border border-slate-200">Examples</th>
                  <th className="text-left p-3 font-semibold text-slate-900 border border-slate-200">Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Account Registration Data</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Name, email address, company name, job title, phone number</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Account creation, authentication, customer support</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Billing &amp; Payment Data</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Billing address, payment method details (processed by Stripe; we do not store full card numbers)</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Subscription management, invoicing, tax compliance</td>
                </tr>
                <tr>
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Customer Financial Data</td>
                  <td className="p-3 border border-slate-200 text-slate-600">ERP data, ledger entries, CRM records, payroll data, budget projections, financial statements, CSV/Excel uploads</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Providing the FP&amp;A platform services (processed as Data Processor)</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Communication Data</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Support tickets, emails, chat messages, feedback, survey responses</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Customer support, product improvement</td>
                </tr>
                <tr>
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">AI Interaction Data</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Prompts submitted to the AI-CFO, queries, and AI-generated responses</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Providing AI features (ephemeral — not retained after session)</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <h3>2.2 Information Collected Automatically</h3>
          
          <div className="overflow-x-auto not-prose mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-3 font-semibold text-slate-900 border border-slate-200">Category</th>
                  <th className="text-left p-3 font-semibold text-slate-900 border border-slate-200">Examples</th>
                  <th className="text-left p-3 font-semibold text-slate-900 border border-slate-200">Legal Basis</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Device &amp; Browser Data</td>
                  <td className="p-3 border border-slate-200 text-slate-600">IP address, browser type/version, operating system, device type, screen resolution</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Legitimate interest (security, optimization)</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Usage Data</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Pages visited, features used, actions taken, session duration, click patterns, referral URLs</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Legitimate interest (product improvement)</td>
                </tr>
                <tr>
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Log Data</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Server logs, error reports, API call metadata (timestamps, endpoints, status codes)</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Legitimate interest (debugging, security monitoring)</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Cookie &amp; Tracking Data</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Cookie identifiers, pixel tags, local storage data (see Section 5 for full details)</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Consent (marketing); Legitimate interest (essential cookies)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>2.3 Information from Third Parties</h3>
          <ul>
            <li><strong>Accounting Integrations:</strong> When you connect QuickBooks, Xero, NetSuite, or other accounting systems, we receive the financial data you authorize for syncing.</li>
            <li><strong>CRM Integrations:</strong> When connecting Salesforce, HubSpot, or similar tools, we receive the customer and revenue data you authorize.</li>
            <li><strong>Single Sign-On (SSO) Providers:</strong> If you use Google Workspace, Microsoft Entra ID, or Okta for authentication, we receive your name, email, and organization identifier.</li>
            <li><strong>Business Contact Data:</strong> We may receive your professional contact information from business data providers (e.g., LinkedIn, Clearbit) for marketing purposes, subject to applicable opt-out rights.</li>
          </ul>
          
          <h3>2.4 Sensitive Data</h3>
          <p>We do not intentionally collect sensitive personal data (e.g., racial or ethnic origin, political opinions, religious beliefs, genetic data, biometric data, health data, or sexual orientation). If Customer Data contains incidental personal data of Customer&apos;s employees or clients (e.g., names on payroll records), such data is processed solely as part of providing the Platform services under the Customer&apos;s instruction.</p>


          {/* ============================================================ */}
          {/* SECTION 3: HOW WE USE YOUR INFORMATION */}
          {/* ============================================================ */}
          <h2 id="privacy-3">3. How We Use Your Information</h2>
          
          <p>We use your information for the following purposes:</p>
          
          <p><strong>3.1 Service Delivery.</strong> To provide, maintain, and operate the Cloud Services, including financial modeling, forecasting, report generation, data integrations, and the AI-CFO assistant.</p>
          
          <p><strong>3.2 Account Management.</strong> To create and manage your account, process subscriptions, handle billing and invoicing, and communicate about your account status.</p>
          
          <p><strong>3.3 Customer Support.</strong> To respond to your inquiries, troubleshoot issues, and provide technical assistance.</p>
          
          <p><strong>3.4 Product Improvement.</strong> To analyze usage patterns (in aggregate and anonymized form), identify bugs, improve platform performance, and develop new features. We do <strong>not</strong> use Customer Financial Data for product improvement — only anonymized usage metadata.</p>
          
          <p><strong>3.5 Security &amp; Fraud Prevention.</strong> To detect, investigate, and prevent unauthorized access, security breaches, fraud, and other illegal activities. This includes analyzing login patterns, monitoring API usage, and maintaining audit logs.</p>
          
          <p><strong>3.6 Communications.</strong> To send transactional communications (e.g., onboarding emails, security alerts, billing receipts) and, with your consent, marketing communications about new features, webinars, and industry insights. You may opt out of marketing communications at any time.</p>
          
          <p><strong>3.7 Legal Compliance.</strong> To comply with applicable laws, regulations, legal processes, or enforceable governmental requests, and to exercise or defend our legal rights.</p>
          
          <p><strong>3.8 Aggregated Analytics.</strong> To create Aggregated Anonymous Data for industry benchmarking, statistical analysis, and product development. Aggregated Anonymous Data cannot identify any individual or organization.</p>
          
          <h3>Legal Bases for Processing (GDPR)</h3>
          <p>For users in the European Economic Area (EEA), the United Kingdom, and Switzerland, we process personal data on the following legal bases:</p>
          <ul>
            <li><strong>Contractual Necessity:</strong> Processing required to perform our contract with you (Sections 3.1, 3.2, 3.3).</li>
            <li><strong>Legitimate Interest:</strong> Processing for our legitimate business interests that do not override your rights (Sections 3.4, 3.5, 3.8), such as product improvement and security.</li>
            <li><strong>Consent:</strong> Processing where you have given explicit consent, such as marketing communications and non-essential cookies (Section 3.6).</li>
            <li><strong>Legal Obligation:</strong> Processing required to comply with legal requirements (Section 3.7).</li>
          </ul>


          {/* ============================================================ */}
          {/* SECTION 4: AI DATA PROCESSING */}
          {/* ============================================================ */}
          <h2 id="privacy-4">4. Artificial Intelligence &amp; Data Processing</h2>
          
          <div className="bg-purple-50/50 rounded-xl p-6 border border-purple-100 mb-6 not-prose">
            <div className="flex items-start gap-3">
              <Cpu className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-purple-900 m-0 font-semibold mb-2">Our AI Data Promise</p>
                <p className="text-sm text-purple-800 m-0">
                  FinaPilot integrates AI and machine learning capabilities into its platform. We are committed to full transparency about how your data interacts with AI systems. This section provides specific disclosures that meet the requirements of the EU AI Act and best practices established by leading enterprise FP&amp;A providers.
                </p>
              </div>
            </div>
          </div>
          
          <p><strong>4.1 What Data Is Processed by AI.</strong> When you use AI Features (e.g., AI-CFO assistant, automated board narratives, anomaly detection), the following data may be processed by our AI systems:</p>
          <ul>
            <li>The specific financial data, metrics, or context you include in your prompt or that is automatically included from your active financial model.</li>
            <li>The text of your natural language query or instruction.</li>
            <li>Historical trends and KPIs from your connected data sources (only for the duration of the request).</li>
          </ul>
          
          <p><strong>4.2 How AI Processes Your Data.</strong></p>
          <ul>
            <li><strong>Ephemeral Processing:</strong> Customer Data sent to AI Features is processed in real-time, ephemeral compute environments. Data is <strong>not</strong> stored in AI memory, caches, or logs after the response is generated.</li>
            <li><strong>No Model Training:</strong> Your data, prompts, and AI-generated outputs are <strong>never</strong> used to train, fine-tune, or improve any AI model — including FinaPilot&apos;s own models, third-party LLMs (e.g., Google, OpenAI, Anthropic), or any other machine learning system.</li>
            <li><strong>No Telemetry:</strong> Customer Data processed by AI is exempt from analytics, telemetry, and performance monitoring by third-party AI infrastructure providers.</li>
          </ul>
          
          <p><strong>4.3 Third-Party AI Infrastructure.</strong> FinaPilot may use enterprise-tier AI infrastructure from providers such as:</p>
          <ul>
            <li><strong>Google Cloud Vertex AI / Gemini API</strong> — under enterprise terms that contractually prohibit Google from using Customer Data for any purpose beyond fulfilling the API request.</li>
            <li><strong>Azure OpenAI Service</strong> — under Microsoft&apos;s enterprise data protection commitments (data is not used for model training).</li>
            <li><strong>AWS Bedrock</strong> — under AWS&apos;s enterprise AI terms (data isolation guaranteed).</li>
          </ul>
          <p>All third-party AI providers are bound by Data Processing Agreements, and our contracts with them explicitly prohibit the use of Customer Data for model training or improvement.</p>
          
          <p><strong>4.4 Automated Decision-Making.</strong> FinaPilot&apos;s AI Features are designed as <strong>decision-support tools</strong>, not automated decision-making systems. The AI provides suggestions, insights, and analysis, but does not make binding decisions about individuals. Specifically:</p>
          <ul>
            <li>AI does not make, and is not designed to make, decisions that produce legal effects or similarly significant effects on individuals (as defined by GDPR Article 22).</li>
            <li>All AI-generated content (forecasts, narratives, recommendations) requires human review before use in any material business decision.</li>
            <li>If you believe an AI-generated output has materially affected you, you may contact <a href="mailto:ai-ethics@finapilot.ai">ai-ethics@finapilot.ai</a> to request a human review.</li>
          </ul>
          
          <p><strong>4.5 AI Output Ownership.</strong> You retain full ownership of all AI-generated outputs produced based on your data. We claim no intellectual property rights over AI Outputs.</p>
          
          <p><strong>4.6 Opting Out of AI Features.</strong> You may choose not to use AI Features. Enterprise customers can disable AI Features for their entire organization via the platform&apos;s admin settings. Disabling AI will not affect the core FP&amp;A functionality of the platform.</p>


          {/* ============================================================ */}
          {/* SECTION 5: COOKIES */}
          {/* ============================================================ */}
          <h2 id="privacy-5">5. Cookies &amp; Tracking Technologies</h2>
          
          <p>We use cookies and similar technologies to enhance your experience, analyze usage, and support our marketing efforts.</p>
          
          <h3>5.1 Types of Cookies We Use</h3>
          
          <div className="overflow-x-auto not-prose mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-3 font-semibold text-slate-900 border border-slate-200">Type</th>
                  <th className="text-left p-3 font-semibold text-slate-900 border border-slate-200">Purpose</th>
                  <th className="text-left p-3 font-semibold text-slate-900 border border-slate-200">Duration</th>
                  <th className="text-left p-3 font-semibold text-slate-900 border border-slate-200">Consent Required?</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Strictly Necessary</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Authentication, session management, security (CSRF tokens), load balancing</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Session / up to 1 year</td>
                  <td className="p-3 border border-slate-200 text-emerald-700 font-medium">No (essential)</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Functional</td>
                  <td className="p-3 border border-slate-200 text-slate-600">User preferences, language settings, dashboard layouts, theme selection</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Up to 1 year</td>
                  <td className="p-3 border border-slate-200 text-amber-700 font-medium">Yes</td>
                </tr>
                <tr>
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Analytics &amp; Performance</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Usage analytics (Vercel Analytics, Google Analytics GA4), page load performance, error tracking</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Up to 2 years</td>
                  <td className="p-3 border border-slate-200 text-amber-700 font-medium">Yes</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Marketing &amp; Advertising</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Conversion tracking, retargeting, ad effectiveness measurement (e.g., LinkedIn Insight, Google Ads)</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Up to 2 years</td>
                  <td className="p-3 border border-slate-200 text-amber-700 font-medium">Yes</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <p><strong>5.2 Managing Cookies.</strong> You can control cookies through:</p>
          <ul>
            <li><strong>Browser Settings:</strong> Most browsers allow you to block or delete cookies. Note that blocking essential cookies may prevent the Platform from functioning correctly.</li>
            <li><strong>Cookie Consent Banner:</strong> On your first visit, we display a consent banner where you can accept or reject non-essential cookies.</li>
            <li><strong>Opt-Out Links:</strong> For specific third-party analytics, you may use: Google&apos;s opt-out browser add-on, the NAI opt-out page, or the DAA opt-out page.</li>
          </ul>
          
          <p><strong>5.3 Do Not Track.</strong> See Section 15 for our response to Do Not Track and Global Privacy Control signals.</p>


          {/* ============================================================ */}
          {/* SECTION 6: HOW WE SHARE */}
          {/* ============================================================ */}
          <h2 id="privacy-6">6. How We Share Your Information</h2>
          
          <p>We do not sell your personal data. We do not share your Customer Financial Data with third parties for their own marketing purposes. We share information only in the following limited circumstances:</p>
          
          <p><strong>6.1 Service Providers &amp; Subprocessors.</strong> We share data with carefully vetted third-party service providers who process data on our behalf. These providers are contractually bound by Data Processing Agreements that restrict their use of data to the specific services they provide to us. See Section 17 for our Subprocessor list.</p>
          
          <p><strong>6.2 Legal Requirements.</strong> We may disclose information if required by law, regulation, legal process, or governmental request, including to meet national security or law enforcement requirements. Where legally permitted, we will attempt to notify you before making such disclosures.</p>
          
          <p><strong>6.3 Business Transfers.</strong> In connection with a merger, acquisition, reorganization, asset sale, or bankruptcy proceeding, your information may be transferred. We will provide notice before your information is transferred and becomes subject to a different privacy policy.</p>
          
          <p><strong>6.4 With Your Consent.</strong> We may share information with third parties when you have given explicit consent, such as when you choose to integrate with third-party applications.</p>
          
          <p><strong>6.5 Aggregated Data.</strong> We may share Aggregated Anonymous Data (which cannot identify you) with partners, investors, and the public for industry research and benchmarking purposes.</p>
          
          <p><strong>6.6 Within Your Organization.</strong> If you are using the Platform as part of an Enterprise subscription, your organization&apos;s administrator may have access to your account information, usage data, and activities within the platform, in accordance with your organization&apos;s internal policies.</p>


          {/* ============================================================ */}
          {/* SECTION 7: DATA RETENTION */}
          {/* ============================================================ */}
          <h2 id="privacy-7">7. Data Retention</h2>
          
          <p>We retain your information only as long as necessary for the purposes described in this Privacy Policy or as required by law.</p>
          
          <div className="overflow-x-auto not-prose mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-3 font-semibold text-slate-900 border border-slate-200">Data Category</th>
                  <th className="text-left p-3 font-semibold text-slate-900 border border-slate-200">Retention Period</th>
                  <th className="text-left p-3 font-semibold text-slate-900 border border-slate-200">Basis</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Customer Financial Data</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Duration of subscription + 30 days for export</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Contract / Customer instruction</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Account Data</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Duration of account + 90 days after deletion request</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Contract / Legitimate interest</td>
                </tr>
                <tr>
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Billing &amp; Invoice Data</td>
                  <td className="p-3 border border-slate-200 text-slate-600">7 years from transaction date</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Legal obligation (tax/financial records)</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">AI Interaction Data (Prompts/Outputs)</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Ephemeral — deleted immediately after response</td>
                  <td className="p-3 border border-slate-200 text-slate-600">By design (zero retention)</td>
                </tr>
                <tr>
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Usage / Analytics Data</td>
                  <td className="p-3 border border-slate-200 text-slate-600">26 months (then anonymized)</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Legitimate interest</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Security Logs &amp; Audit Trails</td>
                  <td className="p-3 border border-slate-200 text-slate-600">12 months (rolling)</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Legitimate interest / Legal obligation</td>
                </tr>
                <tr>
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Marketing Communications</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Until opt-out + 30 days for processing</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Consent</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <p>Upon expiration of the retention period, data is securely deleted or irreversibly anonymized. For Customer Financial Data, see our Terms of Service Section 18 for detailed post-termination data handling procedures.</p>


          {/* ============================================================ */}
          {/* SECTION 8: DATA SECURITY */}
          {/* ============================================================ */}
          <h2 id="privacy-8">8. Data Security</h2>
          
          <p>FinaPilot maintains a comprehensive, enterprise-grade Information Security Management System (ISMS) to protect your data. Key measures include:</p>
          
          <p><strong>8.1 Certifications.</strong></p>
          <ul>
            <li><strong>SOC 2 Type II</strong> — Annual independent audit covering Security, Availability, Processing Integrity, Confidentiality, and Privacy.</li>
            <li><strong>ISO 27001 Aligned</strong> — Our ISMS follows ISO/IEC 27001:2022 controls.</li>
          </ul>
          
          <p><strong>8.2 Technical Safeguards.</strong></p>
          <ul>
            <li><strong>Encryption at Rest:</strong> AES-256 for all stored data.</li>
            <li><strong>Encryption in Transit:</strong> TLS 1.2/1.3 for all data transmissions.</li>
            <li><strong>Key Management:</strong> Industry-standard KMS with automatic key rotation.</li>
            <li><strong>Access Control:</strong> Role-based access control (RBAC), multi-factor authentication for internal systems, and principle of least privilege.</li>
            <li><strong>Network Security:</strong> Web application firewall (WAF), DDoS protection, intrusion detection systems, and network segmentation.</li>
          </ul>
          
          <p><strong>8.3 Operational Safeguards.</strong></p>
          <ul>
            <li>Employee background checks and mandatory security awareness training.</li>
            <li>Continuous automated vulnerability scanning.</li>
            <li>Annual third-party penetration testing by independent security firms.</li>
            <li>Documented Security Incident Response Plan with 72-hour breach notification.</li>
            <li>Business continuity and disaster recovery planning with regular testing.</li>
          </ul>
          
          <p><strong>8.4 Responsibility.</strong> While we implement industry-leading security measures, no method of transmission or storage is 100% secure. You are responsible for maintaining the security of your account credentials and for ensuring your Authorized Users follow appropriate security practices.</p>


          {/* ============================================================ */}
          {/* SECTION 9: INTERNATIONAL TRANSFERS */}
          {/* ============================================================ */}
          <h2 id="privacy-9">9. International Data Transfers</h2>
          
          <p><strong>9.1 Transfer Mechanisms.</strong> FinaPilot is headquartered in the United States. If you are located outside the United States, your data may be transferred to, stored, and processed in the United States or other countries where our service providers are located. We ensure that international data transfers comply with applicable Data Protection Laws through the following mechanisms:</p>
          <ul>
            <li><strong>EU-U.S. Data Privacy Framework (DPF):</strong> FinaPilot adheres to the EU-U.S. Data Privacy Framework, the UK Extension to the EU-U.S. DPF, and the Swiss-U.S. Data Privacy Framework.</li>
            <li><strong>Standard Contractual Clauses (SCCs):</strong> Where required, we incorporate the European Commission&apos;s Standard Contractual Clauses (2021/914) into our data processing agreements.</li>
            <li><strong>Supplementary Measures:</strong> We implement additional technical and organizational measures (encryption, pseudonymization, access controls) to ensure an essentially equivalent level of protection as required by applicable law.</li>
          </ul>
          
          <p><strong>9.2 Data Residency Options.</strong> Enterprise customers may request that Customer Financial Data be stored and processed exclusively within specific geographic regions (e.g., United States, European Union, or Asia-Pacific). Data residency options are available as part of Enterprise and Enterprise Plus subscription tiers and are subject to the applicable Order Form.</p>


          {/* ============================================================ */}
          {/* SECTION 10: GDPR RIGHTS */}
          {/* ============================================================ */}
          <h2 id="privacy-10">10. Your Privacy Rights (European Economic Area, UK &amp; Switzerland — GDPR)</h2>
          
          <p>If you are located in the EEA, the United Kingdom, or Switzerland, you have the following rights under the General Data Protection Regulation (GDPR) and the UK GDPR:</p>
          
          <ul>
            <li><strong>Right of Access (Art. 15):</strong> You have the right to request a copy of the personal data we hold about you.</li>
            <li><strong>Right to Rectification (Art. 16):</strong> You may request that we correct any inaccurate or incomplete personal data.</li>
            <li><strong>Right to Erasure / &ldquo;Right to be Forgotten&rdquo; (Art. 17):</strong> You may request that we delete your personal data, subject to legal retention obligations.</li>
            <li><strong>Right to Restriction of Processing (Art. 18):</strong> You may request that we restrict the processing of your personal data under certain circumstances.</li>
            <li><strong>Right to Data Portability (Art. 20):</strong> You may request a copy of your personal data in a structured, commonly used, machine-readable format (e.g., CSV, JSON).</li>
            <li><strong>Right to Object (Art. 21):</strong> You may object to the processing of your personal data based on our legitimate interests. You may also object to processing for direct marketing purposes at any time.</li>
            <li><strong>Right to Withdraw Consent (Art. 7):</strong> Where processing is based on consent, you may withdraw your consent at any time without affecting the lawfulness of prior processing.</li>
            <li><strong>Right to Lodge a Complaint:</strong> You have the right to lodge a complaint with your local Data Protection Authority (e.g., the ICO in the UK, CNIL in France, BfDI in Germany).</li>
          </ul>
          
          <p><strong>For Enterprise Platform Users:</strong> If you access the Platform through your employer (the Enterprise Customer), your employer is the Data Controller for Customer Financial Data. Please direct any requests related to Customer Financial Data to your organization&apos;s administrator. FinaPilot will cooperate with its Enterprise Customers to fulfill verified data subject requests.</p>
          
          <p><strong>How to Exercise Your Rights:</strong> Submit requests to <a href="mailto:privacy@finapilot.ai">privacy@finapilot.ai</a>. We will respond within thirty (30) days. We may need to verify your identity before processing your request.</p>


          {/* ============================================================ */}
          {/* SECTION 11: CCPA RIGHTS */}
          {/* ============================================================ */}
          <h2 id="privacy-11">11. Your Privacy Rights (California — CCPA/CPRA)</h2>
          
          <p>If you are a California resident, you have the following rights under the California Consumer Privacy Act, as amended by the California Privacy Rights Act (&ldquo;CCPA/CPRA&rdquo;):</p>
          
          <ul>
            <li><strong>Right to Know:</strong> You have the right to request information about the categories and specific pieces of personal information we have collected, the sources of collection, the business or commercial purposes for collection, and the categories of third parties with whom we share your information.</li>
            <li><strong>Right to Delete:</strong> You may request that we delete the personal information we have collected from you, subject to certain exceptions.</li>
            <li><strong>Right to Correct:</strong> You may request that we correct inaccurate personal information we maintain about you.</li>
            <li><strong>Right to Opt-Out of Sale/Sharing:</strong> <strong>We do not sell your personal information.</strong> We do not &ldquo;share&rdquo; your personal information for cross-context behavioral advertising as defined by the CPRA.</li>
            <li><strong>Right to Limit Use of Sensitive Personal Information:</strong> If we process sensitive personal information beyond what is necessary to provide the services, you may request that we limit such use.</li>
            <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your CCPA/CPRA rights.</li>
          </ul>
          
          <p><strong>Categories Under CCPA:</strong> In the preceding 12 months, we have collected the following categories of personal information: Identifiers; Commercial Information (billing); Internet/Electronic Activity; Professional/Employment Information; Inferences drawn from the above.</p>
          
          <p><strong>Authorized Agent:</strong> You may designate an authorized agent to make a request on your behalf. The agent must provide written authorization, and we may verify your identity directly.</p>
          
          <p><strong>How to Exercise Your Rights:</strong> Submit requests to <a href="mailto:privacy@finapilot.ai">privacy@finapilot.ai</a> or call our privacy line. We will respond within forty-five (45) days.</p>
          
          <p><strong>Financial Incentives:</strong> We do not offer financial incentives for the collection, sale, or deletion of personal information.</p>


          {/* ============================================================ */}
          {/* SECTION 12: OTHER STATE RIGHTS */}
          {/* ============================================================ */}
          <h2 id="privacy-12">12. State-Specific Privacy Rights (United States)</h2>
          
          <p>In addition to California, residents of the following states have specific privacy rights:</p>
          
          <ul>
            <li><strong>Virginia (VCDPA):</strong> Right to access, correct, delete, obtain a copy, and opt out of targeted advertising, sale, and profiling.</li>
            <li><strong>Colorado (CPA):</strong> Right to access, correct, delete, data portability, and opt out of targeted advertising, sale, and profiling.</li>
            <li><strong>Connecticut (CTDPA):</strong> Right to access, correct, delete, data portability, and opt out of sale and targeted advertising.</li>
            <li><strong>Utah (UCPA):</strong> Right to access, delete, data portability, and opt out of sale and targeted advertising.</li>
            <li><strong>Texas (TDPSA), Oregon (OCPA), Montana (MCDPA), Tennessee, Indiana, Iowa, and other states with enacted privacy laws:</strong> We comply with the specific requirements of each applicable state privacy law.</li>
          </ul>
          
          <p>To exercise your rights under any state privacy law, contact <a href="mailto:privacy@finapilot.ai">privacy@finapilot.ai</a>. If your request is denied, you may appeal by responding to the denial with a written appeal, and we will respond within sixty (60) days.</p>


          {/* ============================================================ */}
          {/* SECTION 13: CHILDREN */}
          {/* ============================================================ */}
          <h2 id="privacy-13">13. Children&apos;s Privacy</h2>
          
          <p>The Cloud Services are designed for businesses and are not intended for individuals under the age of eighteen (18). We do not knowingly collect personal information from children under 18 (or under 16 in the EEA). If we become aware that we have collected personal information from a child, we will take immediate steps to delete such data. If you believe we have inadvertently collected information from a child, please contact us at <a href="mailto:privacy@finapilot.ai">privacy@finapilot.ai</a>.</p>


          {/* ============================================================ */}
          {/* SECTION 14: THIRD PARTY LINKS */}
          {/* ============================================================ */}
          <h2 id="privacy-14">14. Third-Party Links &amp; Integrations</h2>
          
          <p><strong>14.1 Third-Party Websites.</strong> Our Website and Platform may contain links to third-party websites, applications, or services that are not operated by FinaPilot. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party websites or services. We encourage you to review the privacy policies of any third-party service before providing information to them.</p>
          
          <p><strong>14.2 Integrations.</strong> When you connect third-party applications (e.g., QuickBooks, Xero, Salesforce) to the Platform, data flows between those services and FinaPilot are governed by this Privacy Policy for data received by FinaPilot, and by the third party&apos;s privacy policy for data received by the third party. You should review the privacy practices of any service you integrate before enabling the connection.</p>
          
          <p><strong>14.3 Social Logins.</strong> If you authenticate using a third-party login provider (e.g., Google, Microsoft), we receive only the information authorized by that provider (typically name, email, and profile picture). We do not receive your password.</p>


          {/* ============================================================ */}
          {/* SECTION 15: DNT / GPC */}
          {/* ============================================================ */}
          <h2 id="privacy-15">15. Do Not Track / Global Privacy Control</h2>
          
          <p><strong>15.1 Do Not Track (DNT).</strong> There is currently no universally accepted standard for how to respond to browser &ldquo;Do Not Track&rdquo; signals. We currently do not respond to DNT signals on our marketing website.</p>
          
          <p><strong>15.2 Global Privacy Control (GPC).</strong> We honor Global Privacy Control (GPC) signals. If your browser sends a GPC signal, we will treat it as a valid opt-out request for the sale or sharing of personal information (as applicable under CCPA/CPRA) and will disable non-essential tracking cookies for your session.</p>


          {/* ============================================================ */}
          {/* SECTION 16: DPA */}
          {/* ============================================================ */}
          <h2 id="privacy-16">16. Data Processing Agreement</h2>
          
          <p>For Enterprise customers, FinaPilot offers a Data Processing Agreement (DPA) that establishes the contractual framework for our processing of Customer Financial Data as a Data Processor. The DPA includes:</p>
          <ul>
            <li>Scope and purpose of processing.</li>
            <li>Obligations of the Data Controller (Customer) and Data Processor (FinaPilot).</li>
            <li>Technical and organizational security measures.</li>
            <li>Subprocessor management and notification requirements.</li>
            <li>Data breach notification procedures.</li>
            <li>Cross-border transfer safeguards (Standard Contractual Clauses).</li>
            <li>Audit rights and compliance documentation.</li>
            <li>Data deletion and return procedures upon termination.</li>
          </ul>
          <p>To request a copy of our DPA, contact <a href="mailto:legal@finapilot.ai">legal@finapilot.ai</a>.</p>


          {/* ============================================================ */}
          {/* SECTION 17: SUBPROCESSORS */}
          {/* ============================================================ */}
          <h2 id="privacy-17">17. Subprocessors</h2>
          
          <p>FinaPilot engages the following categories of subprocessors to assist in providing the Cloud Services:</p>
          
          <div className="overflow-x-auto not-prose mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-3 font-semibold text-slate-900 border border-slate-200">Category</th>
                  <th className="text-left p-3 font-semibold text-slate-900 border border-slate-200">Provider(s)</th>
                  <th className="text-left p-3 font-semibold text-slate-900 border border-slate-200">Purpose</th>
                  <th className="text-left p-3 font-semibold text-slate-900 border border-slate-200">Location</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Cloud Infrastructure</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Amazon Web Services (AWS)</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Hosting, compute, storage, database</td>
                  <td className="p-3 border border-slate-200 text-slate-600">US (primary), EU (optional)</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Application Hosting</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Vercel, Render</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Frontend hosting, API deployment</td>
                  <td className="p-3 border border-slate-200 text-slate-600">US</td>
                </tr>
                <tr>
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Database</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Neon (PostgreSQL)</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Primary data storage</td>
                  <td className="p-3 border border-slate-200 text-slate-600">US</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">AI / ML Infrastructure</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Google Cloud (Vertex AI / Gemini), Azure OpenAI</td>
                  <td className="p-3 border border-slate-200 text-slate-600">AI inference (no training, no data retention)</td>
                  <td className="p-3 border border-slate-200 text-slate-600">US</td>
                </tr>
                <tr>
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Payment Processing</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Stripe</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Payment processing, invoicing</td>
                  <td className="p-3 border border-slate-200 text-slate-600">US</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Email / Transactional</td>
                  <td className="p-3 border border-slate-200 text-slate-600">SendGrid, Resend</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Transactional emails, notifications</td>
                  <td className="p-3 border border-slate-200 text-slate-600">US</td>
                </tr>
                <tr>
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Analytics</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Vercel Analytics, Google Analytics (GA4)</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Website analytics, product usage</td>
                  <td className="p-3 border border-slate-200 text-slate-600">US</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-3 border border-slate-200 font-medium text-slate-900">Customer Support</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Intercom, Zendesk</td>
                  <td className="p-3 border border-slate-200 text-slate-600">Support ticketing, live chat</td>
                  <td className="p-3 border border-slate-200 text-slate-600">US</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <p>All subprocessors are bound by Data Processing Agreements that require them to protect your data at a level equivalent to this Privacy Policy. Enterprise customers are entitled to thirty (30) days&apos; advance notice before any new subprocessor is engaged. A complete, up-to-date list of subprocessors is available in the customer portal or upon request.</p>


          {/* ============================================================ */}
          {/* SECTION 18: CHANGES */}
          {/* ============================================================ */}
          <h2 id="privacy-18">18. Changes to This Privacy Policy</h2>
          
          <p><strong>18.1 Updates.</strong> We may update this Privacy Policy from time to time to reflect changes in our data practices, applicable laws, or our services. We will always display the &ldquo;Last Updated&rdquo; date at the top of this page.</p>
          
          <p><strong>18.2 Notification of Material Changes.</strong> For material changes that significantly affect how we process your personal data, we will provide notice through one or more of the following methods:</p>
          <ul>
            <li>A prominent notice on our Website.</li>
            <li>An in-platform notification.</li>
            <li>An email to the address associated with your account.</li>
          </ul>
          <p>Such notice will be provided at least thirty (30) days before the changes take effect, giving you time to review and, if applicable, adjust your privacy settings or contact us with questions.</p>
          
          <p><strong>18.3 Continued Use.</strong> Your continued use of the Cloud Services after the effective date of an updated Privacy Policy constitutes your acknowledgment of the updated practices. If you do not agree to the updated policy, you should discontinue use of the Services and contact us to exercise your data rights.</p>


          {/* ============================================================ */}
          {/* SECTION 19: CONTACT US */}
          {/* ============================================================ */}
          <h2 id="privacy-19">19. Contact Us</h2>
          
          <p>If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us using the information below:</p>

        </article>

        {/* Contact Section */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h3 className="text-lg font-bold text-slate-900 mb-6">How to Reach Us</h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl">
              <Fingerprint className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">Data Protection Officer (DPO)</p>
                <a href="mailto:privacy@finapilot.ai" className="text-emerald-600 hover:text-emerald-800 block">privacy@finapilot.ai</a>
                <p className="text-slate-500 mt-1">For all privacy rights requests, data subject access requests, and DPA inquiries.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
              <Scale className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">Legal Department</p>
                <a href="mailto:legal@finapilot.ai" className="text-blue-600 hover:text-blue-800 block">legal@finapilot.ai</a>
                <p className="text-slate-500 mt-1">For DPA requests, enterprise contract negotiations, and legal inquiries.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl">
              <Shield className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">Security Team</p>
                <a href="mailto:security@finapilot.ai" className="text-purple-600 hover:text-purple-800 block">security@finapilot.ai</a>
                <p className="text-slate-500 mt-1">For reporting security vulnerabilities or incidents.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl">
              <Cpu className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">AI Ethics Team</p>
                <a href="mailto:ai-ethics@finapilot.ai" className="text-amber-600 hover:text-amber-800 block">ai-ethics@finapilot.ai</a>
                <p className="text-slate-500 mt-1">For concerns about AI bias, automated decisions, or AI data processing.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-slate-50 rounded-xl text-sm text-slate-600">
            <p className="m-0"><strong>EU Representative:</strong> For GDPR purposes, our representative in the European Union can be contacted at <a href="mailto:eu-representative@finapilot.ai" className="text-emerald-600">eu-representative@finapilot.ai</a>.</p>
            <p className="m-0 mt-2"><strong>UK Representative:</strong> For UK GDPR purposes, our representative in the United Kingdom can be contacted at <a href="mailto:uk-representative@finapilot.ai" className="text-emerald-600">uk-representative@finapilot.ai</a>.</p>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-12 pt-8 border-t border-slate-200 text-sm text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>&copy; {new Date().getFullYear()} FinaPilot Inc. All rights reserved. Registered in Delaware, USA.</p>
          <div className="flex gap-4">
            <Link href="/legal/master-subscription-agreement" className="text-emerald-600 hover:text-emerald-800">Terms of Service</Link>
            <span className="text-slate-300">|</span>
            <a href="mailto:privacy@finapilot.ai" className="text-emerald-600 hover:text-emerald-800">privacy@finapilot.ai</a>
          </div>
        </div>
      </main>
    </div>
  )
}
