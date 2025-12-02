"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Shield,
  Lock,
  Server,
  Eye,
  FileCheck,
  Globe,
  CheckCircle,
  Download,
  ExternalLink,
  AlertTriangle,
  Key,
  Database,
  Cloud,
  FileText,
} from "lucide-react"

export function SecurityCompliancePage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Security & Compliance</h1>
        <p className="text-slate-600">
          Your financial data is protected with enterprise-grade security and compliance standards
        </p>
      </div>

      {/* Trust Badges */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-2 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div className="font-bold text-green-900">SOC 2 Type II</div>
              <div className="text-xs text-green-700">In Progress</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6 text-blue-600" />
              </div>
              <div className="font-bold text-blue-900">256-bit AES</div>
              <div className="text-xs text-blue-700">Encryption</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-purple-200 bg-purple-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <Globe className="w-6 h-6 text-purple-600" />
              </div>
              <div className="font-bold text-purple-900">GDPR</div>
              <div className="text-xs text-purple-700">Compliant</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <Server className="w-6 h-6 text-orange-600" />
              </div>
              <div className="font-bold text-orange-900">99.9% Uptime</div>
              <div className="text-xs text-orange-700">SLA Guarantee</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-600" />
            Data Security
          </CardTitle>
          <CardDescription>How we protect your financial information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Key className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">End-to-End Encryption</h4>
                  <p className="text-sm text-slate-600">
                    All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Your financial data is never
                    stored in plain text.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Database className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Secure Data Storage</h4>
                  <p className="text-sm text-slate-600">
                    Data is stored in SOC 2 certified data centers with redundant backups across multiple geographic
                    regions.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Eye className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Access Controls</h4>
                  <p className="text-sm text-slate-600">
                    Role-based access control (RBAC) with multi-factor authentication (MFA) for all team members.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Cloud className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Infrastructure Security</h4>
                  <p className="text-sm text-slate-600">
                    Hosted on AWS with VPC isolation, DDoS protection, and automated security patching.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileCheck className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Regular Audits</h4>
                  <p className="text-sm text-slate-600">
                    Quarterly security audits and penetration testing by independent third-party security firms.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Incident Response</h4>
                  <p className="text-sm text-slate-600">
                    24/7 security monitoring with automated threat detection and immediate incident response protocols.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-indigo-600" />
            Compliance & Certifications
          </CardTitle>
          <CardDescription>Meeting global and regional regulatory standards</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-slate-900">SOC 2 Type II</h4>
                  <Badge className="mt-1 bg-yellow-100 text-yellow-800 border-yellow-200">In Progress</Badge>
                </div>
                <Shield className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm text-slate-600">
                Currently undergoing SOC 2 Type II audit. Expected completion: Q2 2025
              </p>
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-slate-900">GDPR Compliance</h4>
                  <Badge className="mt-1 bg-green-100 text-green-800 border-green-200">Certified</Badge>
                </div>
                <Globe className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm text-slate-600">
                Full compliance with EU General Data Protection Regulation for data privacy
              </p>
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-slate-900">India Data Localization</h4>
                  <Badge className="mt-1 bg-green-100 text-green-800 border-green-200">Compliant</Badge>
                </div>
                <Server className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm text-slate-600">
                Indian customer data stored in Mumbai data center per RBI guidelines
              </p>
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-slate-900">ISO 27001</h4>
                  <Badge className="mt-1 bg-yellow-100 text-yellow-800 border-yellow-200">Planned</Badge>
                </div>
                <FileCheck className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm text-slate-600">Information security management certification planned for 2025</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            Data Location & Residency
          </CardTitle>
          <CardDescription>Where your data is stored and processed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Server className="w-4 h-4 text-indigo-600" />
                </div>
                <h4 className="font-semibold text-slate-900">India (Primary)</h4>
              </div>
              <p className="text-sm text-slate-600 mb-2">Mumbai AWS Region</p>
              <ul className="text-xs text-slate-600 space-y-1">
                <li className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  Indian customer data
                </li>
                <li className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  RBI compliant
                </li>
              </ul>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Server className="w-4 h-4 text-indigo-600" />
                </div>
                <h4 className="font-semibold text-slate-900">US (Secondary)</h4>
              </div>
              <p className="text-sm text-slate-600 mb-2">US-East AWS Region</p>
              <ul className="text-xs text-slate-600 space-y-1">
                <li className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  Global customers
                </li>
                <li className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  GDPR compliant
                </li>
              </ul>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Server className="w-4 h-4 text-indigo-600" />
                </div>
                <h4 className="font-semibold text-slate-900">EU (Backup)</h4>
              </div>
              <p className="text-sm text-slate-600 mb-2">Frankfurt AWS Region</p>
              <ul className="text-xs text-slate-600 space-y-1">
                <li className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  EU customers
                </li>
                <li className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  GDPR compliant
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Terms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Legal & Privacy
          </CardTitle>
          <CardDescription>Our commitment to transparency and data protection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <Button variant="outline" className="justify-start h-auto py-4 bg-transparent">
              <div className="flex items-start gap-3 text-left">
                <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900 mb-1">Privacy Policy</div>
                  <div className="text-sm text-slate-600">How we collect, use, and protect your data</div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 ml-auto" />
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-4 bg-transparent">
              <div className="flex items-start gap-3 text-left">
                <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900 mb-1">Terms of Service</div>
                  <div className="text-sm text-slate-600">Legal terms and conditions of use</div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 ml-auto" />
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-4 bg-transparent">
              <div className="flex items-start gap-3 text-left">
                <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900 mb-1">Data Processing Agreement</div>
                  <div className="text-sm text-slate-600">GDPR-compliant DPA for enterprise customers</div>
                </div>
                <Download className="w-4 h-4 text-slate-400 ml-auto" />
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-4 bg-transparent">
              <div className="flex items-start gap-3 text-left">
                <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900 mb-1">Security Whitepaper</div>
                  <div className="text-sm text-slate-600">Detailed technical security documentation</div>
                </div>
                <Download className="w-4 h-4 text-slate-400 ml-auto" />
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contact Security Team */}
      <Card className="border-2 border-indigo-200 bg-indigo-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-indigo-900 mb-2">Have Security Questions?</h3>
              <p className="text-sm text-indigo-800 mb-4">
                Our security team is here to answer any questions about our security practices, compliance status, or
                data protection measures.
              </p>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Contact Security Team
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
