# XSS (Cross-Site Scripting) Security Fix

## Vulnerability Summary

Your application had multiple **Cross-Site Scripting (XSS)** vulnerabilities where user-controlled or database-sourced HTML content was being directly injected into the DOM using `dangerouslySetInnerHTML` without sanitization.

**Attack Vector:** If an attacker compromises the database or controls input data, they could inject malicious JavaScript code that would execute in users' browsers, allowing them to:
- Steal session tokens and authentication cookies
- Perform unauthorized actions on behalf of users
- Redirect users to phishing sites
- Deface the application UI
- Steal sensitive information

## Locations Fixed

### 1. **app/page.tsx (Line 242)** - CRITICAL
**Vulnerability:** Admin's `ctaTitle` was directly injected into an HTML heading
```javascript
// BEFORE (Vulnerable)
<span dangerouslySetInnerHTML={{ __html: hp.ctaTitle }} />

// AFTER (Fixed)
<span dangerouslySetInnerHTML={{ __html: sanitizeHtml(hp.ctaTitle) }} />
```

### 2. **components/quiz/quiz-player.tsx** - CRITICAL
Multiple instances where quiz data (questions, options, explanations) were not sanitized:
- Line 927: `currentQuestion.question`
- Line 973: Quiz option text
- Line 992: `currentQuestion.explanation`

### 3. **components/chatbot.tsx** - HIGH
AI chatbot responses were formatted with inline HTML and injected without sanitization:
- Line 117: Bullet list formatting
- Line 129: Numbered list formatting
- Line 137: Regular paragraph formatting

## Solution Implementation

### Added DOMPurify Library
Added `dompurify@^3.0.9` to package.json for HTML sanitization.

### Created `lib/sanitize.ts` Utility Module
Provides three sanitization functions:

1. **`sanitizeHtml(html: string)`** - General purpose sanitization
   - Allows: `<b>`, `<i>`, `<em>`, `<strong>`, `<a>`, `<p>`, `<br>`, `<ul>`, `<ol>`, `<li>`, headings, `<code>`, etc.
   - Blocks: `<script>`, `onclick`, `onerror`, event handlers, and other dangerous content

2. **`escapeHtml(text: string)`** - Escapes HTML entities
   - Use for plain text that shouldn't contain any HTML

3. **`sanitizeChatbotHtml(html: string)`** - AI/Chatbot specific sanitization
   - More permissive for formatting-heavy content while still blocking malicious code
   - Allows: formatting tags, code blocks, inline styling
   - Blocks: Links, scripts, dangerous attributes

## Implementation Guidelines

### When to Use Each Function

```javascript
// For general HTML content from database/admin input
import { sanitizeHtml } from '@/lib/sanitize'
<span dangerouslySetInnerHTML={{ __html: sanitizeHtml(dbContent) }} />

// For AI/Chatbot responses with formatting
import { sanitizeChatbotHtml } from '@/lib/sanitize'
<p dangerouslySetInnerHTML={{ __html: sanitizeChatbotHtml(aiResponse) }} />

// For plain text without HTML
import { escapeHtml } from '@/lib/sanitize'
<p>{escapeHtml(plainText)}</p>
```

### Best Practice: Avoid `dangerouslySetInnerHTML` When Possible
The safest approach is to avoid HTML injection entirely:

```javascript
// MOST SECURE - No HTML injection at all
<h1>{title}</h1>

// SECURE - Only when HTML is absolutely necessary
<h1 dangerouslySetInnerHTML={{ __html: sanitizeHtml(title) }} />

// INSECURE - Never do this
<h1 dangerouslySetInnerHTML={{ __html: title }} />
```

## Allowed HTML Tags by Function

### sanitizeHtml()
`b`, `i`, `em`, `strong`, `a`, `p`, `br`, `ul`, `ol`, `li`, `h1-h6`, `blockquote`, `code`, `pre`, `span`, `div`, `sup`, `sub`, `mark`

**Allowed Attributes:** `href`, `title`, `target`, `rel`, `class`

### sanitizeChatbotHtml()
`b`, `i`, `em`, `strong`, `code`, `span`, `br`, `ul`, `ol`, `li`, `p`, `div`, `sup`, `sub`

**Allowed Attributes:** `class` (for styling)

## Testing the Fix

### Manual Testing
1. Try to inject `<script>alert('XSS')</script>` into admin fields
2. Verify no JavaScript alert appears
3. Check that legitimate HTML formatting still works (bold, lists, links)

### Automated Testing
```javascript
import { sanitizeHtml } from '@/lib/sanitize'

// Should remove script tags
sanitizeHtml('<p>Hello</p><script>alert("XSS")</script>')
// Output: <p>Hello</p>

// Should preserve safe HTML
sanitizeHtml('<p><strong>Bold text</strong></p>')
// Output: <p><strong>Bold text</strong></p>

// Should strip onclick attributes
sanitizeHtml('<button onclick="alert(1)">Click</button>')
// Output: <button>Click</button>
```

## Future Prevention

1. **Input Validation:** Validate all data on the backend before storing
2. **Output Encoding:** Always sanitize when outputting user/dynamic content
3. **Content Security Policy:** Implement strict CSP headers (already partially configured)
4. **Security Headers:** Continue using security headers like X-Frame-Options, X-Content-Type-Options
5. **Regular Audits:** Use tools like npm audit to check for vulnerable dependencies

## Related Security Fixes

- **OAuth Flow Fix** - Fixed Authorization Code Flow mismatch
- **Admin Security** - Hide admin links from non-authenticated users
- **Clickjacking Prevention** - Changed X-Frame-Options to SAMEORIGIN

## References
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [React Security Best Practices](https://react.dev/learn/security)
