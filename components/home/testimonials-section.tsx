"use client"

import { Star, Quote, GraduationCap, CheckCircle2 } from "lucide-react"
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

function TestimonialCard({ testimonial }: { testimonial: typeof testimonials[0] }) {
  return (
    <Card className="relative w-[320px] sm:w-[360px] shrink-0 border-border/50 bg-card overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-300 group mx-3">
      {/* Quote decoration */}
      <div className="absolute top-4 right-4">
        <Quote className="h-8 w-8 text-primary/10 group-hover:text-primary/20 transition-colors" />
      </div>
      
      <CardContent className="p-5 sm:p-6">
        {/* Rating */}
        <div className="flex items-center gap-0.5 mb-3">
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
        <p className="text-sm text-foreground leading-relaxed mb-5 line-clamp-3">
          {`"${testimonial.text}"`}
        </p>
        
        {/* Author Info */}
        <div className="flex items-center gap-3 pt-4 border-t border-border/50">
          {/* Avatar with real photo */}
          <Avatar className="h-11 w-11 border-2 border-primary/20">
            <AvatarImage src={testimonial.image} alt={testimonial.name} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm font-bold">
              {testimonial.avatar}
            </AvatarFallback>
          </Avatar>
          
          {/* Name & Role */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-foreground text-sm">{testimonial.name}</p>
              {testimonial.verified && (
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-muted-foreground truncate">
                {testimonial.role}
              </p>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 border-0 shrink-0">
                Verified
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Course Badge */}
        <div className="mt-3">
          <Badge variant="outline" className="text-[10px] font-medium">
            <GraduationCap className="h-3 w-3 mr-1" />
            {testimonial.course}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

export function TestimonialsSection() {
  // Double the testimonials for seamless loop
  const duplicatedTestimonials = [...testimonials, ...testimonials]

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-muted/50 via-muted/30 to-background overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Star className="h-4 w-4 fill-current" />
            Student Reviews
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3">
            What Students Say
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm sm:text-base">
            Join thousands of successful students who use TechVyro for exam preparation
          </p>
        </div>
      </div>

      {/* Marquee Container - Full Width */}
      <div className="relative">
        {/* Gradient Overlays for fade effect */}
        <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-40 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-40 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        
        {/* First Row - Moving Left */}
        <div className="flex animate-marquee hover:[animation-play-state:paused]">
          {duplicatedTestimonials.map((testimonial, index) => (
            <TestimonialCard key={`row1-${testimonial.id}-${index}`} testimonial={testimonial} />
          ))}
        </div>
        
        {/* Second Row - Moving Right (reverse) */}
        <div className="flex animate-marquee-reverse hover:[animation-play-state:paused] mt-6">
          {duplicatedTestimonials.reverse().map((testimonial, index) => (
            <TestimonialCard key={`row2-${testimonial.id}-${index}`} testimonial={testimonial} />
          ))}
        </div>
      </div>
      
      {/* Bottom Trust Text */}
      <div className="container mx-auto px-4">
        <div className="text-center mt-12 sm:mt-14">
          <p className="text-sm text-muted-foreground">
            Trusted by <span className="font-semibold text-primary">10,000+</span> students across India
          </p>
        </div>
      </div>
    </section>
  )
}
