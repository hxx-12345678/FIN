"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building2, Zap, Play, Database, Sparkles, CheckCircle2, ArrowRight, Gauge } from "lucide-react"
import { toast } from "sonner"

interface PostLoginOptionsProps {
  onSelectDemo: () => void
  onSelectRealData: () => void
}

export function PostLoginOptions({ onSelectDemo, onSelectRealData }: PostLoginOptionsProps) {
  const [selectedOption, setSelectedOption] = useState<"demo" | "real" | null>(null)
  const [hoveredOption, setHoveredOption] = useState<"demo" | "real" | null>(null)

  const handleDemoSelect = () => {
    setSelectedOption("demo")
    localStorage.setItem("finapilot_demo_mode", "true")
    localStorage.setItem("finapilot_has_visited", "true")
    localStorage.setItem("finapilot_onboarding_complete", "true")
    toast.success("Starting with demo company data")
    setTimeout(() => {
      onSelectDemo()
    }, 500)
  }

  const handleRealDataSelect = () => {
    setSelectedOption("real")
    localStorage.removeItem("finapilot_demo_mode")
    localStorage.setItem("finapilot_has_visited", "true")
    toast.success("Ready to connect your accounting system")
    setTimeout(() => {
      onSelectRealData()
    }, 500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 relative overflow-hidden">
      {/* Background Effects - Light Theme */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-200/30 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        <div 
          className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:40px_40px] opacity-30"
          style={{ transform: 'perspective(1000px) rotateX(60deg) translateY(-100px) scale(2)' }}
        />
      </div>

      <div className="w-full max-w-6xl space-y-12 relative z-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(79,70,229,0.2)]">
              <Gauge className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-slate-900">
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">FinaPilot</span>
            </h1>
          </div>
          <p className="text-xl sm:text-2xl text-slate-600 font-medium tracking-tight">
            Choose how you'd like to get started
          </p>
        </motion.div>

        {/* Options */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Demo Company Option */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card 
              className={`cursor-pointer transition-all duration-500 border-2 h-full group relative overflow-hidden ${
                selectedOption === "demo" 
                  ? "border-indigo-500 bg-indigo-50 shadow-[0_0_60px_rgba(79,70,229,0.2)]" 
                  : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xl"
              }`}
              onClick={handleDemoSelect}
              onMouseEnter={() => setHoveredOption("demo")}
              onMouseLeave={() => setHoveredOption(null)}
            >
              {/* Glow Effect */}
              {selectedOption === "demo" && (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/50 via-transparent to-purple-100/50" />
              )}
              
              <CardHeader className="pb-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <motion.div 
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                        selectedOption === "demo"
                          ? "bg-indigo-600 shadow-[0_0_30px_rgba(79,70,229,0.4)]"
                          : "bg-gradient-to-br from-purple-500 to-pink-500 group-hover:scale-110"
                      }`}
                      animate={selectedOption === "demo" ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Play className="w-8 h-8 text-white" />
                    </motion.div>
                    <div>
                      <CardTitle className="text-3xl font-black tracking-tight text-slate-900 mb-1">
                        Explore Demo Company
                      </CardTitle>
                      <CardDescription className="text-slate-600 font-medium text-base">
                        Try FinaPilot with sample data
                      </CardDescription>
                    </div>
                  </div>
                  <AnimatePresence>
                    {selectedOption === "demo" && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                      >
                        <Badge className="bg-indigo-600 text-white border-0 px-4 py-2 text-xs font-black uppercase tracking-widest">
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Selected
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 relative z-10">
                <p className="text-slate-700 font-medium leading-relaxed text-lg">
                  Experience FinaPilot's full capabilities with a pre-configured demo company. 
                  Perfect for exploring features without connecting your own data.
                </p>
                
                <div className="space-y-3 pt-4">
                  {[
                    "Pre-loaded financial data",
                    "Sample transactions and models",
                    "All features available",
                    "No setup required"
                  ].map((feature, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex items-center gap-3 text-base text-slate-700"
                    >
                      <div className="w-6 h-6 rounded-full bg-green-100 border border-green-300 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="font-medium">{feature}</span>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    className={`w-full mt-6 h-14 font-black uppercase tracking-widest text-sm rounded-xl transition-all ${
                      selectedOption === "demo"
                        ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg"
                    }`}
                    size="lg"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDemoSelect()
                    }}
                    disabled={selectedOption !== null && selectedOption !== "demo"}
                  >
                    Start with Demo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Real Data Option */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card 
              className={`cursor-pointer transition-all duration-500 border-2 h-full group relative overflow-hidden ${
                selectedOption === "real" 
                  ? "border-indigo-500 bg-indigo-50 shadow-[0_0_60px_rgba(79,70,229,0.2)]" 
                  : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xl"
              }`}
              onClick={handleRealDataSelect}
              onMouseEnter={() => setHoveredOption("real")}
              onMouseLeave={() => setHoveredOption(null)}
            >
              {/* Glow Effect */}
              {selectedOption === "real" && (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/50 via-transparent to-purple-100/50" />
              )}
              
              <CardHeader className="pb-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <motion.div 
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                        selectedOption === "real"
                          ? "bg-indigo-600 shadow-[0_0_30px_rgba(79,70,229,0.4)]"
                          : "bg-gradient-to-br from-blue-500 to-cyan-500 group-hover:scale-110"
                      }`}
                      animate={selectedOption === "real" ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Database className="w-8 h-8 text-white" />
                    </motion.div>
                    <div>
                      <CardTitle className="text-3xl font-black tracking-tight text-slate-900 mb-1">
                        Connect with Real Data
                      </CardTitle>
                      <CardDescription className="text-slate-600 font-medium text-base">
                        Connect your accounting system
                      </CardDescription>
                    </div>
                  </div>
                  <AnimatePresence>
                    {selectedOption === "real" && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                      >
                        <Badge className="bg-indigo-600 text-white border-0 px-4 py-2 text-xs font-black uppercase tracking-widest">
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Selected
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 relative z-10">
                <p className="text-slate-700 font-medium leading-relaxed text-lg">
                  Connect your accounting system to import real financial data and start managing 
                  your company's finances with FinaPilot.
                </p>
                
                <div className="space-y-3 pt-4">
                  {[
                    "Connect QuickBooks, Xero, or CSV",
                    "Automatic data sync",
                    "Real-time financial insights",
                    "Production-ready setup"
                  ].map((feature, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      className="flex items-center gap-3 text-base text-slate-700"
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="font-medium">{feature}</span>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    className={`w-full mt-6 h-14 font-black uppercase tracking-widest text-sm rounded-xl transition-all ${
                      selectedOption === "real"
                        ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl"
                        : "bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-300"
                    }`}
                    size="lg"
                    variant={selectedOption === "real" ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRealDataSelect()
                    }}
                    disabled={selectedOption !== null && selectedOption !== "real"}
                  >
                    <Building2 className="mr-2 h-5 w-5" />
                    Connect Accounting System
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-blue-50 border-blue-200 shadow-sm">
            <CardContent className="pt-8 pb-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 border border-indigo-300 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-base font-black uppercase tracking-widest text-indigo-600 mb-2">
                    Flexible Setup
                  </p>
                  <p className="text-lg font-medium text-slate-700 leading-relaxed">
                    You can switch between demo and real data anytime. Start with demo to explore, then connect your real data when ready.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
