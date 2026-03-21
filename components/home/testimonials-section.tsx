"use client"

import { Star, Quote, GraduationCap, BookOpen, Award, CheckCircle2, Users, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const testimonials = [
  {
    id: 1,
    name: "Rahul Sharma",
    role: "Engineering Student",
    avatar: "RS",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
    rating: 5,
    text: "TechVyro has been a game-changer for my studies. Found all my semester notes and previous year papers in one place!",
    course: "B.Tech CSE",
    verified: true,
  },
  {
    id: 2,
    name: "Priya Patel",
    role: "Medical Student",
    avatar: "PP",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
    rating: 5,
    text: "The quality of PDFs here is amazing. All my medical references are well-organized. Thank you TechVyro!",
    course: "MBBS",
    verified: true,
  },
  {
    id: 3,
    name: "Amit Kumar",
    role: "NDA Aspirant",
    avatar: "AK",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
    rating: 5,
    text: "Best resource for NDA materials. The daily updates keep me prepared for the latest exam patterns.",
    course: "NDA Preparation",
    verified: true,
  },
  {
    id: 4,
    name: "Sneha Gupta",
    role: "Commerce Student",
    avatar: "SG",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=faces",
    rating: 5,
    text: "From accounting notes to business studies, everything is available for free. One-click download saves so much time!",
    course: "B.Com",
    verified: true,
  },
  {
    id: 5,
    name: "Vikram Singh",
    role: "Class 12 Student",
    avatar: "VS",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces",
    rating: 5,
    text: "Board exam preparation became so much easier. All subjects, all chapters - everything is here!",
    course: "CBSE Class 12",
    verified: true,
  },
  {
    id: 6,
    name: "Ananya Reddy",
    role: "JEE Aspirant",
    avatar: "AR",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
    rating: 5,
    text: "JEE preparation PDFs are top-notch. Physics and Chemistry notes are exactly what I needed!",
    course: "JEE Main",
    verified: true,
  },
]

const trustIndicators = [
  { icon: Users, label: "10,000+", subtext: "Happy Students", color: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: BookOpen, label: "500+", subtext: "Quality PDFs", color: "text-green-500", bg: "bg-green-500/10" },
  { icon: Award, label: "4.9/5", subtext: "User Rating", color: "text-amber-500", bg: "bg-amber-500/10" },
  { icon: TrendingUp, label: "Daily", subtext: "New Content", color: "text-rose-500", bg: "bg-rose-500/10" },
]

export function TestimonialsSection() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-muted/50 via-muted/30 to-background overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Star className="h-4 w-4 fill-current" />
            Student Testimonials
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Trusted by <span className="text-primary">10,000+</span> Students
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
            Join thousands of successful students who use TechVyro for their exam preparation
          </p>
        </div>

        {/* Trust Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-12 sm:mb-16 max-w-3xl mx-auto">
          {trustIndicators.map((item, index) => (
            <div 
              key={index}
              className="flex flex-col items-center p-4 sm:p-5 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl ${item.bg} mb-2 sm:mb-3`}>
                <item.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${item.color}`} />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{item.label}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{item.subtext}</p>
            </div>
          ))}
        </div>

        {/* Testimonials Grid - Show 2-3 at once */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {testimonials.slice(0, 6).map((testimonial, index) => (
            <Card 
              key={testimonial.id}
              className="relative border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden hover:shadow-xl hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 group"
            >
              {/* Quote decoration */}
              <div className="absolute top-3 right-3">
                <Quote className="h-6 w-6 text-primary/10 group-hover:text-primary/20 transition-colors" />
              </div>
              
              <CardContent className="p-5 sm:p-6">
                {/* Rating */}
                <div className="flex items-center gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`h-4 w-4 ${
                        i < testimonial.rating 
                          ? "text-amber-500 fill-amber-500" 
                          : "text-muted-foreground/30"
                      }`} 
                    />
                  ))}
                </div>
                
                {/* Testimonial Text */}
                <p className="text-sm text-foreground leading-relaxed mb-5">
                  {`"${testimonial.text}"`}
                </p>
                
                {/* Author Info */}
                <div className="flex items-center gap-3">
                  {/* Avatar with real photo */}
                  <Avatar className="h-11 w-11 border-2 border-primary/20 ring-2 ring-background">
                    <AvatarImage src={testimonial.image} alt={testimonial.name} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm font-bold">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Name & Role */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-foreground text-sm truncate">{testimonial.name}</p>
                      {testimonial.verified && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {testimonial.role}
                    </p>
                  </div>
                  
                  {/* Verified Badge */}
                  {testimonial.verified && (
                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-600 border-0 shrink-0">
                      Verified
                    </Badge>
                  )}
                </div>
                
                {/* Course Badge */}
                <div className="mt-4 pt-4 border-t border-border/50">
                  <Badge variant="outline" className="text-[10px] font-medium">
                    <GraduationCap className="h-3 w-3 mr-1" />
                    {testimonial.course}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Bottom CTA */}
        <div className="text-center mt-10 sm:mt-12">
          <p className="text-sm text-muted-foreground">
            Join <span className="font-semibold text-primary">10,000+ students</span> who trust TechVyro for their studies
          </p>
        </div>
      </div>
    </section>
  )
}
