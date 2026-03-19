export interface Category {
  id: string
  name: string
  slug: string
  color: string
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
  created_at: string
  updated_at: string
  category?: Category | null
}
