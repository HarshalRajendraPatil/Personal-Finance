import { categorizeMerchant } from '../utils/merchantCategorizer.js';
import Category from '../models/Category.js';

/**
 * Parses receipt/invoice text and extracts financial parameters using heuristics.
 */
export const parseReceiptTextHeuristically = (rawText = '', userCategories = []) => {
  if (!rawText || typeof rawText !== 'string') {
    return {
      merchant: 'Receipt Expense',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      tax: 0,
      notes: '',
      confidence: 0.3,
      categoryName: 'Shopping',
      categoryId: null,
    };
  }

  const lines = rawText.split(/\r\n|\n|\r/).map((l) => l.trim()).filter(Boolean);

  // 1. Merchant Extraction: Usually in the first 3 lines
  let merchant = '';
  const noiseHeaderWords = /tax invoice|bill|cash memo|receipt|welcome|order|table|pos|payment|retail/i;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    if (line.length >= 3 && !noiseHeaderWords.test(line) && !/^\d+$/.test(line)) {
      merchant = line.replace(/[^a-zA-Z0-9\s&'-]/g, '').trim();
      if (merchant.length > 2) break;
    }
  }
  if (!merchant && lines.length > 0) {
    merchant = lines[0].slice(0, 30);
  }

  // 2. Date Extraction: Look for DD/MM/YYYY, YYYY-MM-DD, DD-MMM-YYYY, DD/MM/YY
  let date = new Date().toISOString().split('T')[0];
  const dateRegex = /(\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b|\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b)/i;
  for (const line of lines) {
    const match = line.match(dateRegex);
    if (match) {
      const parsed = new Date(match[1]);
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2000 && parsed.getFullYear() <= 2030) {
        date = parsed.toISOString().split('T')[0];
        break;
      }
    }
  }

  // 3. Amount Extraction: Look for Total, Grand Total, Net Payable, Bill Amount, Amount, Subtotal
  let amount = 0;
  const totalKeywords = /total|grand\s*total|net\s*payable|bill\s*amount|amount\s*paid|subtotal|balance\s*due/i;
  const amountPattern = /(?:₹|rs\.?|inr|\$|€)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi;

  for (const line of lines) {
    if (totalKeywords.test(line)) {
      const matches = [...line.matchAll(amountPattern)];
      if (matches.length > 0) {
        for (let j = matches.length - 1; j >= 0; j--) {
          const numStr = matches[j][1].replace(/,/g, '');
          const val = parseFloat(numStr);
          if (val > amount && val < 5000000) {
            amount = val;
          }
        }
      }
    }
  }

  // If amount still 0, pick the largest numeric currency figure from the document
  if (amount === 0) {
    for (const line of lines) {
      const matches = [...line.matchAll(amountPattern)];
      for (const m of matches) {
        const val = parseFloat(m[1].replace(/,/g, ''));
        if (val > amount && val < 5000000 && !/phone|tel|gstin|fssai|pincode|zip/i.test(line)) {
          amount = val;
        }
      }
    }
  }

  // 4. Tax extraction (GST / VAT / Tax)
  let tax = 0;
  const taxKeywords = /gst|cgst|sgst|igst|vat|sales\s*tax|tax/i;
  for (const line of lines) {
    if (taxKeywords.test(line) && !/gstin/i.test(line)) {
      const match = line.match(amountPattern);
      if (match) {
        const val = parseFloat(match[0].replace(/[^0-9.]/g, ''));
        if (val > 0 && val < amount) {
          tax += val;
        }
      }
    }
  }

  // 5. Categorize Merchant
  const catMatch = categorizeMerchant(merchant, userCategories);

  return {
    merchant: merchant || 'Scanned Store',
    date,
    amount: Number(amount.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    notes: `AI Receipt OCR: ${lines.slice(0, 4).join(', ')}`.slice(0, 150),
    confidence: amount > 0 ? 0.85 : 0.45,
    categoryName: catMatch.categoryName,
    categoryId: catMatch.categoryId,
    subcategoryName: catMatch.subcategoryName,
    subcategoryId: catMatch.subcategoryId,
    rawText: rawText.slice(0, 500),
  };
};

/**
 * Calls Gemini Vision API if key is available, else falls back to Heuristic OCR parser.
 */
export const scanReceiptWithAI = async ({ imageUrl, imageBase64, textContent, userId }) => {
  const userCategories = await Category.find({ user: userId }).lean();
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (apiKey && (imageBase64 || imageUrl)) {
    try {
      const prompt = `You are a high-accuracy receipt and invoice OCR parser.
Analyze this receipt/invoice image and extract structured financial details in valid JSON with NO markdown formatting:
{
  "merchant": "Store or merchant or vendor name",
  "date": "YYYY-MM-DD",
  "amount": 0.00,
  "tax": 0.00,
  "categorySuggested": "Food & Dining / Groceries / Shopping / Bills & Utilities / Health / Entertainment / Transportation",
  "itemsSummary": "Brief comma-separated list of items purchased"
}`;

      let imagePart = null;
      if (imageBase64) {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        imagePart = {
          inline_data: {
            mime_type: 'image/jpeg',
            data: base64Data,
          },
        };
      }

      if (imagePart) {
        // const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
        const body = {
          contents: [
            {
              parts: [{ text: prompt }, imagePart],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const result = await response.json();
          const candidateText = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            const parsed = JSON.parse(candidateText);
            const merchant = parsed.merchant || 'Receipt Merchant';
            const catMatch = categorizeMerchant(merchant, userCategories);

            return {
              success: true,
              engine: 'gemini-vision-ai',
              merchant,
              date: parsed.date || new Date().toISOString().split('T')[0],
              amount: parseFloat(parsed.amount) || 0,
              tax: parseFloat(parsed.tax) || 0,
              notes: parsed.itemsSummary ? `Items: ${parsed.itemsSummary}` : '',
              categoryName: catMatch.categoryName || parsed.categorySuggested || 'Shopping',
              categoryId: catMatch.categoryId,
              subcategoryId: catMatch.subcategoryId,
              confidence: 0.96,
            };
          }
        }
      }
    } catch (err) {
      console.warn('[AI OCR] Gemini API fallback to heuristic parser:', err.message);
    }
  }

  // Fallback: If image URL from Cloudinary or text is provided, extract heuristically
  const extracted = parseReceiptTextHeuristically(textContent || imageUrl || '', userCategories);
  return {
    success: true,
    engine: 'capise-heuristic-ocr',
    ...extracted,
  };
};
