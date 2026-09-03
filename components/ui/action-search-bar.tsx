"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Send, FileText, BookOpen, GraduationCap, Zap, HelpCircle } from "lucide-react"

function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

export interface Action {
  id: string
  label: string
  icon: React.ReactNode
  description?: string
  short?: string
  end?: string
  href?: string
  onClick?: () => void
}

interface SearchResult {
  actions: Action[]
}

const defaultActions: Action[] = [
  {
    id: "1",
    label: "Browse PDFs",
    icon: <FileText className="h-4 w-4 text-blue-500" />,
    description: "Library",
    short: "Ctrl+B",
    end: "Browse",
    href: "/browse",
  },
  {
    id: "2",
    label: "Start Quiz",
    icon: <HelpCircle className="h-4 w-4 text-amber-500" />,
    description: "Quiz Portal",
    short: "Ctrl+Q",
    end: "Practice",
    href: "/quiz",
  },
  {
    id: "3",
    label: "Mock Tests",
    icon: <GraduationCap className="h-4 w-4 text-purple-500" />,
    description: "Test Series",
    short: "Ctrl+T",
    end: "Test",
    href: "/test-series",
  },
  {
    id: "4",
    label: "Quick Study",
    icon: <Zap className="h-4 w-4 text-green-500" />,
    description: "Fast track",
    short: "",
    end: "Learn",
    href: "/browse",
  },
  {
    id: "5",
    label: "All Categories",
    icon: <BookOpen className="h-4 w-4 text-rose-500" />,
    description: "Explore",
    short: "",
    end: "Categories",
    href: "/browse",
  },
]

interface ActionSearchBarProps {
  actions?: Action[]
  placeholder?: string
  className?: string
}

function ActionSearchBar({ 
  actions = defaultActions, 
  placeholder = "Search TechVyro...",
  className 
}: ActionSearchBarProps) {
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<SearchResult | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [selectedAction, setSelectedAction] = useState<Action | null>(null)
  const debouncedQuery = useDebounce(query, 200)

  useEffect(() => {
    if (!isFocused) {
      setResult(null)
      return
    }

    if (!debouncedQuery) {
      setResult({ actions })
      return
    }

    const normalizedQuery = debouncedQuery.toLowerCase().trim()
    const filteredActions = actions.filter((action) => {
      const searchableText = action.label.toLowerCase()
      return searchableText.includes(normalizedQuery)
    })

    setResult({ actions: filteredActions })
  }, [debouncedQuery, isFocused, actions])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }

  const handleActionClick = (action: Action) => {
    if (action.onClick) {
      action.onClick()
    } else if (action.href) {
      window.location.href = action.href
    }
    setSelectedAction(action)
    setIsFocused(false)
  }

  const container = {
    hidden: { opacity: 0, height: 0 },
    show: {
      opacity: 1,
      height: "auto",
      transition: {
        height: { duration: 0.4 },
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      height: 0,
      transition: {
        height: { duration: 0.3 },
        opacity: { duration: 0.2 },
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: { duration: 0.2 },
    },
  }

  const handleFocus = () => {
    setSelectedAction(null)
    setIsFocused(true)
  }

  return (
    <div className={`w-full max-w-xl mx-auto ${className || ""}`}>
      <div className="relative flex flex-col justify-start items-center">
        <div className="w-full max-w-sm sticky top-0 bg-background z-10 pt-4 pb-1">
          <label
            className="text-xs font-medium text-muted-foreground mb-1 block"
            htmlFor="search"
          >
            Quick Actions
          </label>
          <div className="relative">
            <Input
              type="text"
              placeholder={placeholder}
              value={query}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              className="pl-3 pr-9 py-1.5 h-10 text-sm rounded-xl focus-visible:ring-offset-0 bg-card border-border/60"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4">
              <AnimatePresence mode="popLayout">
                {query.length > 0 ? (
                  <motion.div
                    key="send"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Send className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="search"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Search className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm">
          <AnimatePresence>
            {isFocused && result && !selectedAction && (
              <motion.div
                className="w-full border rounded-xl shadow-lg overflow-hidden border-border bg-card mt-1"
                variants={container}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                <motion.ul>
                  {result.actions.map((action) => (
                    <motion.li
                      key={action.id}
                      className="px-3 py-2.5 flex items-center justify-between hover:bg-muted cursor-pointer transition-colors"
                      variants={item}
                      layout
                      onClick={() => handleActionClick(action)}
                    >
                      <div className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-muted-foreground">
                            {action.icon}
                          </span>
                          <span className="text-sm font-medium text-foreground">
                            {action.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {action.description}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">
                          {action.short}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {action.end}
                        </span>
                      </div>
                    </motion.li>
                  ))}
                </motion.ul>
                <div className="px-3 py-2 border-t border-border bg-muted/30">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Press Enter to select</span>
                    <span>ESC to cancel</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export { ActionSearchBar }
