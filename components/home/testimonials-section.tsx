"use client"

import { useEffect, useState } from "react"
import { Star, Quote, GraduationCap, CheckCircle2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { Testimonial } from "@/lib/types"

const defaultTestimonials: Testimonial[] = [
  {
    id: "1",
    name: "Rahul Sharma",
    course: "NDA Aspirant",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
    rating: 5,
    comment: "TechVyro ne meri NDA preparation ko next level pe le gaya. Notes itne clear hain ki ek baar padhke yaad ho jaata hai!",
    verified: true,
    enabled: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "2",
    name: "Priya Patel",
    course: "B.Tech Student",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
    rating: 5,
    comment: "Engineering ke saare subjects ke notes mil gaye ek jagah. Exam se pehle revision ke liye perfect resource hai!",
    verified: true,
    enabled: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "3",
    name: "Amit Kumar",
    course: "SSC Aspirant",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
    rating: 5,
    comment: "Previous year papers aur solutions sab free mein! Maine 3 competitive exams clear kiye TechVyro ke resources se.",
    verified: true,
    enabled: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "4",
    name: "Sneha Reddy",
    course: "NEET Aspirant",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=faces",
    rating: 5,
    comment: "Biology aur Chemistry ke notes bahut detailed hain. Diagrams itne clear hain ki concepts turant samajh aate hain!",
    verified: true,
    enabled: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "5",
    name: "Vikram Singh",
    course: "UPSC Aspirant",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces",
    rating: 5,
    comment: "Current affairs aur static GK ke PDFs regularly update hote hain. Prelims preparation ke liye best resource!",
    verified: true,
    enabled: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "6",
    name: "Ananya Gupta",
    course: "Class 12 Student",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
    rating: 5,
    comment: "Board exams ke liye NCERT solutions aur sample papers mil gaye. 95% score kiya thanks to TechVyro!",
    verified: true,
    enabled: true,
    createdAt: new Date().toISOString()
  }
]

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const initials = testimonial.name.split(" ").map(n => n[0]).join("").toUpperCase()
  
  return (
    <Card className="relative w-[300px] sm:w-[340px] shrink-0 border-border/50 bg-card overflow-hidden hover:shadow-xl hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 group mx-3">
      {/* Quote decoration */}
      <div className="absolute top-4 right-4">
        <Quote className="h-8 w-8 text-primary/10 group-hover:text-primary/20 transition-colors" />
      </div>
      
      <CardContent className="p-5">
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
          {`"${testimonial.comment}"`}
        </p>
        
        {/* Author Info */}
        <div className="flex items-center gap-3 pt-4 border-t border-border/50">
          {/* Avatar with real photo */}
          <Avatar className="h-11 w-11 border-2 border-primary/20">
            <AvatarImage 
              src={testimonial.avatar} 
              alt={testimonial.name}
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm font-bold">
              {initials}
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
                {testimonial.course}
              </p>
              {testimonial.verified && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 border-0 shrink-0">
                  Verified
                </Badge>
              )}
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
  const [testimonials, setTestimonials] = useState<Testimonial[]>(defaultTestimonials)

  // Load testimonials from localStorage (admin settings)
  useEffect(() => {
    const stored = localStorage.getItem("techvyro_testimonials")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const enabledTestimonials = parsed.filter((t: Testimonial) => t.enabled)
        if (enabledTestimonials.length > 0) {
          setTestimonials(enabledTestimonials)
        }
      } catch {
        // Use defaults on error
      }
    }
  }, [])

  // Filter enabled testimonials and split into two rows
  const enabledTestimonials = testimonials.filter(t => t.enabled)
  
  if (enabledTestimonials.length === 0) return null

  // Double the testimonials for seamless loop
  const row1 = [...enabledTestimonials, ...enabledTestimonials]
  const row2 = [...enabledTestimonials.reverse(), ...enabledTestimonials]

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
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        
        {/* First Row - Moving Left */}
        <div className="flex animate-marquee hover:[animation-play-state:paused]">
          {row1.map((testimonial, index) => (
            <TestimonialCard key={`row1-${testimonial.id}-${index}`} testimonial={testimonial} />
          ))}
        </div>
        
        {/* Second Row - Moving Right (reverse) */}
        <div className="flex animate-marquee-reverse hover:[animation-play-state:paused] mt-6">
          {row2.map((testimonial, index) => (
            <TestimonialCard key={`row2-${testimonial.id}-${index}`} testimonial={testimonial} />
          ))}
        </div>
      </div>
      
      {/* Bottom Trust Text */}
      <div className="container mx-auto px-4">
        <div className="text-center mt-12 sm:mt-14">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="font-medium text-foreground">4.9/5</span>
              <span>Rating</span>
            </div>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <p>
              Trusted by <span className="font-semibold text-primary">10,000+</span> students across India
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
