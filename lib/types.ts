export interface Category {
  id: string
  name: string
  slug: string
  color: string
  description?: string | null
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
  // Storage paths are only populated in trusted server/admin contexts.
  file_path?: string
  file_url?: string | null
  file_size: number | null
  category_id: string | null
  content_type?: import("./pdf-content-metadata").PdfContentType | null
  content_category?: string | null
  content_subcategory?: string | null
  subject?: string | null
  download_count: number
  view_count: number
  average_rating: number | null
  review_count: number
  created_at: string
  updated_at: string
  visibility?: "public" | "unlisted" | "private"
  allow_download?: boolean
  tags?: string[] | null
  seo_title?: string | null
  seo_description?: string | null
  seo_keywords?: string[] | null
  structure_location?: {
    folderId: string
    categoryId: string
    sectionId: string
  } | null
  thumbnail_path?: string | null
  thumbnail_url?: string | null
  page_count?: number | null
  category?: Category | null
  reviews?: Review[]
}

export interface HomepageQuiz {
  id: string
  title: string
  description: string
  category: string
  section?: string
  difficulty: string
  time_limit: number
  questions: { id: string }[]
  enabled: boolean
  created_at: string
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
