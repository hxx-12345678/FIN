"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Quote, TrendingUp, Clock, DollarSign, Users, Star } from "lucide-react"

const testimonials = [
  {
    id: 1,
    name: "Priya Sharma",
    role: "Co-Founder & CEO",
    company: "TechFlow Solutions",
    industry: "SaaS",
    image: "/professional-woman-diverse.png",
    quote:
      "FinaPilot transformed how we manage our finances. What used to take our team 2 days now takes 30 minutes. The AI-CFO feature is like having a financial expert on call 24/7.",
    metrics: {
      timeSaved: "10 hours/week",
      accuracy: "95%",
      runway: "+6 months",
    },
    rating: 5,
  },
  {
    id: 2,
    name: "Rajesh Kumar",
    role: "Finance Director",
    company: "GrowthLabs India",
    industry: "E-commerce",
    image: "/professional-man.jpg",
    quote:
      "The Monte Carlo forecasting gave us confidence to make bold decisions. We extended our runway by 6 months by identifying cost optimization opportunities we never saw before.",
    metrics: {
      timeSaved: "15 hours/week",
      accuracy: "98%",
      runway: "+8 months",
    },
    rating: 5,
  },
  {
    id: 3,
    name: "Ananya Desai",
    role: "CFO",
    company: "HealthTech Innovations",
    industry: "Healthcare",
    image: "/professional-woman-executive.png",
    quote:
      "As a CFO managing multiple stakeholders, FinaPilot's automated reporting and scenario planning features are invaluable. Board meetings are now data-driven conversations, not spreadsheet reviews.",
    metrics: {
      timeSaved: "12 hours/week",
      accuracy: "97%",
      runway: "+4 months",
    },
    rating: 5,
  },
  {
    id: 4,
    name: "Vikram Patel",
    role: "Founder",
    company: "FinServe Pro",
    industry: "Fintech",
    image: "/professional-man-founder.png",
    quote:
      "The integration with Razorpay and Zoho Books was seamless. Within minutes, we had a complete financial model. The AI insights helped us secure our Series A by showing investors we understand our numbers.",
    metrics: {
      timeSaved: "8 hours/week",
      accuracy: "96%",
      runway: "+5 months",
    },
    rating: 5,
  },
]

const stats = [
  { label: "Average Time Saved", value: "10 hrs/week", icon: Clock, color: "text-blue-600" },
  { label: "Forecast Accuracy", value: "95%+", icon: TrendingUp, color: "text-green-600" },
  { label: "Runway Extended", value: "+6 months", icon: DollarSign, color: "text-purple-600" },
  { label: "Happy Customers", value: "500+", icon: Users, color: "text-orange-600" },
]

export function CustomerSuccessStories() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  const currentTestimonial = testimonials[currentIndex]

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="border-slate-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                  <div className="text-xs text-slate-600">{stat.label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Testimonial Carousel */}
      <Card className="border-2 border-indigo-200 bg-gradient-to-br from-white to-indigo-50/30">
        <CardContent className="pt-8">
          <div className="space-y-6">
            {/* Quote Icon */}
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <Quote className="w-6 h-6 text-indigo-600" />
              </div>
            </div>

            {/* Testimonial Content */}
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <div className="flex justify-center gap-1 mb-2">
                {[...Array(currentTestimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-xl text-slate-700 leading-relaxed italic">"{currentTestimonial.quote}"</p>
            </div>

            {/* Author Info */}
            <div className="flex flex-col items-center gap-4">
              <img
                src={currentTestimonial.image || "/placeholder.svg"}
                alt={currentTestimonial.name}
                className="w-16 h-16 rounded-full border-2 border-indigo-200"
              />
              <div className="text-center">
                <div className="font-semibold text-slate-900">{currentTestimonial.name}</div>
                <div className="text-sm text-slate-600">{currentTestimonial.role}</div>
                <div className="text-sm text-slate-600">{currentTestimonial.company}</div>
                <Badge className="mt-2 bg-indigo-100 text-indigo-700 border-indigo-200">
                  {currentTestimonial.industry}
                </Badge>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid md:grid-cols-3 gap-4 max-w-2xl mx-auto pt-4">
              <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                <div className="text-2xl font-bold text-blue-600">{currentTestimonial.metrics.timeSaved}</div>
                <div className="text-xs text-slate-600 mt-1">Time Saved</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                <div className="text-2xl font-bold text-green-600">{currentTestimonial.metrics.accuracy}</div>
                <div className="text-xs text-slate-600 mt-1">Accuracy</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                <div className="text-2xl font-bold text-purple-600">{currentTestimonial.metrics.runway}</div>
                <div className="text-xs text-slate-600 mt-1">Runway Extended</div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button variant="outline" size="sm" onClick={prevTestimonial} className="bg-transparent">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex gap-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentIndex ? "bg-indigo-600 w-8" : "bg-slate-300"
                    }`}
                  />
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={nextTestimonial} className="bg-transparent">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All Testimonials Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {testimonials.map((testimonial) => (
          <Card key={testimonial.id} className="border-slate-200 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <img
                    src={testimonial.image || "/placeholder.svg"}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full border-2 border-slate-200"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{testimonial.name}</div>
                    <div className="text-sm text-slate-600">{testimonial.role}</div>
                    <div className="text-sm text-slate-600">{testimonial.company}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {testimonial.industry}
                  </Badge>
                </div>
                <p className="text-sm text-slate-700 italic">"{testimonial.quote}"</p>
                <div className="flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
