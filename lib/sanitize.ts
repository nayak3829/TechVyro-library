'use client'

import DOMPurify from 'dompurify'

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Allows safe HTML tags like <strong>, <em>, <code>, <br>, <p>, etc.
 * Blocks dangerous tags and attributes like <script>, onclick, onerror, etc.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
      'span', 'div', 'sup', 'sub', 'mark'
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class'],
    KEEP_CONTENT: true,
    RETURN_DOM: false,
  })
}

/**
 * Escapes HTML characters to prevent XSS when using plain text
 */
export function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}

/**
 * Sanitizes HTML from AI/chatbot responses
 * More permissive than sanitizeHtml to allow formatted content
 */
export function sanitizeChatbotHtml(html: string): string {
  if (!html) return ''
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'code', 'span', 'br',
      'ul', 'ol', 'li', 'p', 'div', 'sup', 'sub'
    ],
    ALLOWED_ATTR: ['class'],
    KEEP_CONTENT: true,
    RETURN_DOM: false,
  })
}
