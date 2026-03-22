import type { Env } from '../types'
import {
  corsHeaders,
  securityHeaders,
  validateOriginAndPreflight,
  checkRateLimit,
} from '../middleware'
import { OCR_MAX_FILE_SIZE_BYTES } from '../utils'

// OCR configuration constants
const OCR_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
const OCR_RATE_LIMIT_RETRY_SECONDS = 60

/**
 * Handle /ocr - proxy to Mistral OCR API.
 * Accepts POST with image data and returns OCR results.
 */
export async function handleOcr(request: Request, env: Env, _url: URL): Promise<Response> {
  const check = validateOriginAndPreflight(request, env)
  if (check.response) return check.response
  const origin = check.origin

  // Rate limiting for OCR endpoint
  const rateLimitResponse = await checkRateLimit(env, request, origin, OCR_RATE_LIMIT_RETRY_SECONDS)
  if (rateLimitResponse) return rateLimitResponse

  // Only allow POST for OCR
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        Allow: 'POST',
        ...corsHeaders(origin),
        ...securityHeaders(),
      },
    })
  }

  // Check if Mistral API key is configured
  if (!env.MISTRAL_API_KEY) {
    return new Response(JSON.stringify({ error: 'OCR service not configured' }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin),
        ...securityHeaders(),
      },
    })
  }

  try {
    // Parse the incoming request - expects multipart form data with 'image' field
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null

    if (!imageFile) {
      return new Response(JSON.stringify({ error: "Missing 'image' field in form data" }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
          ...securityHeaders(),
        },
      })
    }

    // Validate file type
    if (
      !OCR_ALLOWED_MIME_TYPES.includes(imageFile.type as (typeof OCR_ALLOWED_MIME_TYPES)[number])
    ) {
      return new Response(
        JSON.stringify({
          error: `Unsupported file type: ${imageFile.type}. Allowed: ${OCR_ALLOWED_MIME_TYPES.join(', ')}`,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin),
            ...securityHeaders(),
          },
        }
      )
    }

    // Validate file size
    if (imageFile.size > OCR_MAX_FILE_SIZE_BYTES) {
      return new Response(
        JSON.stringify({
          error: `File too large: ${(imageFile.size / 1024 / 1024).toFixed(1)}MB. Maximum: 50MB`,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin),
            ...securityHeaders(),
          },
        }
      )
    }

    // Convert image to base64 for Mistral API
    // Use chunked approach to avoid stack overflow with large files
    const imageBuffer = await imageFile.arrayBuffer()
    const bytes = new Uint8Array(imageBuffer)
    const CHUNK_SIZE = 8192
    let base64Image = ''
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.subarray(i, i + CHUNK_SIZE)
      base64Image += String.fromCharCode(...chunk)
    }
    base64Image = btoa(base64Image)
    const dataUrl = `data:${imageFile.type};base64,${base64Image}`

    // Call Mistral OCR API
    const mistralResponse = await fetch('https://api.mistral.ai/v1/ocr', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-ocr-latest',
        document: {
          type: 'image_url',
          image_url: {
            url: dataUrl,
          },
        },
        include_image_base64: false,
        // Enable HTML table formatting for structured table extraction
        // Scoresheets contain player lists and scores that benefit from table structure
        table_format: 'html',
      }),
    })

    if (!mistralResponse.ok) {
      const errorText = await mistralResponse.text()
      console.error('Mistral OCR error:', mistralResponse.status, errorText)

      // Return appropriate error based on status
      if (mistralResponse.status === 401) {
        return new Response(JSON.stringify({ error: 'OCR service authentication failed' }), {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin),
            ...securityHeaders(),
          },
        })
      }

      if (mistralResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'OCR service rate limit exceeded' }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(OCR_RATE_LIMIT_RETRY_SECONDS),
            ...corsHeaders(origin),
            ...securityHeaders(),
          },
        })
      }

      return new Response(JSON.stringify({ error: 'OCR processing failed' }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
          ...securityHeaders(),
        },
      })
    }

    // Return the Mistral OCR response
    const ocrResult = await mistralResponse.json()
    return new Response(JSON.stringify(ocrResult), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin),
        ...securityHeaders(),
      },
    })
  } catch (error) {
    console.error('OCR proxy error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error during OCR processing' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin),
        ...securityHeaders(),
      },
    })
  }
}
