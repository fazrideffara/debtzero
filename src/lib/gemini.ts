import { GoogleGenerativeAI } from '@google/generative-ai'

export interface ReceiptAnalysisResult {
  creditorName: string
  amount: number
  dueDate: string | null
}

/**
 * Converts a file object to a format compatible with Gemini API.
 */
const fileToGenerativePart = (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1]
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Analyzes a bill/receipt image using Gemini 1.5 Flash client-side.
 * Returns structured details about the creditor, amount, and due date.
 */
export const analyzeReceipt = async (
  imageFile: File,
  apiKey: string
): Promise<ReceiptAnalysisResult> => {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('API Key Gemini tidak ditemukan. Harap masukkan API Key Anda di halaman Settings terlebih dahulu.')
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const imagePart = await fileToGenerativePart(imageFile)

    const prompt = `
      Analyze this receipt or bill image and extract the following details in JSON format:
      - creditorName: The name of the creditor, merchant, bank, app, provider, or person who issued the bill or receipt. Keep it clean and short.
      - amount: The total billing amount or outstanding amount as a clean number (no currency symbols, no commas, only float or integer).
      - dueDate: The due date in YYYY-MM-DD format (if visible in the image, otherwise null).

      Return ONLY the raw JSON string without markdown code fences or backticks.
    `

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            imagePart
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    })


    const text = result.response.text()
    if (!text) {
      throw new Error('Gemini API mengembalikan respons kosong.')
    }

    const json = JSON.parse(text.trim())

    return {
      creditorName: json.creditorName || 'Kreditur Baru',
      amount: parseFloat(json.amount) || 0,
      dueDate: json.dueDate || null,
    }
  } catch (err: any) {
    console.error('Gemini OCR Error:', err)
    
    // Check for rate limit or API key error status codes
    if (err.status === 429 || err.message?.includes('429') || err.message?.includes('Quota exceeded')) {
      throw new Error('Limit kuota penggunaan Gemini API tercapai (Rate Limit 429). Harap tunggu beberapa menit sebelum mencoba kembali.')
    }
    if (err.status === 400 || err.message?.includes('API key not valid')) {
      throw new Error('API Key Gemini tidak valid. Harap periksa kembali kunci API Anda di halaman Settings.')
    }
    
    throw new Error(err.message || 'Gagal mendeteksi teks struk. Pastikan kualitas gambar jelas.')
  }
}
