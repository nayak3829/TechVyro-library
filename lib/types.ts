export interface Category {
  id: string
  name: string
  slug: string
  color: string
  created_at: string
}

export interface Review {
  id: string
  pdf_id: string
  user_name: string
  rating: number
  comment: string | null
  created_at: string
}

export interface PDF {
  id: string
  title: string
  description: string | null
  file_path: string
  file_size: number | null
  category_id: string | null
  download_count: number
  view_count: number
  average_rating: number | null
  review_count: number
  created_at: string
  updated_at: string
  category?: Category | null
  reviews?: Review[]
}

export interface Testimonial {
  id: string
  name: string
  course: string
  avatar: string
  rating: number
  comment: string
  verified: boolean
  enabled: boolean
  createdAt: string
}

// Hierarchical Structure: Folder > Category > Section
export interface ContentSection {
  id: string
  name: string
  description: string
  icon: string
  pdfCount: number
  quizCount: number
  order: number
  enabled: boolean
}

export interface ContentCategory {
  id: string
  name: string
  description: string
  color: string
  icon: string
  sections: ContentSection[]
  order: number
  enabled: boolean
}

export interface ContentFolder {
  id: string
  name: string
  description: string
  icon: string
  color: string
  categories: ContentCategory[]
  order: number
  enabled: boolean
  createdAt: string
}
