import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Category from '../models/Category.js';
import { categorizeMerchant, cleanMerchantNarration } from '../utils/merchantCategorizer.js';
import { checkBudgetGuardrails } from './budgetGuardrailService.js';

/**
 * Parses raw CSV text handling quoted fields, commas, and various line endings.
 */
export const parseCSVText = (csvText = '') => {
  if (!csvText || typeof csvText !== 'string') return { headers: [], rows: [] };

  const lines = csvText
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        if (inQuotes && line[i + 1] === char) {
          current += char;
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^["']|["']$/g, ''));
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const parsed = parseLine(lines[i]);
    if (parsed.some((cell) => cell.length > 0)) {
      rows.push(parsed);
    }
  }

  return { headers, rows };
};

/**
 * Auto-detects standard bank statement column names.
 */
export const detectColumnMapping = (headers = []) => {
  const normalized = headers.map((h) => h.toLowerCase().trim().replace(/[_\s-]+/g, ' '));

  const findIdx = (patterns) => {
    for (let i = 0; i < normalized.length; i++) {
      const col = normalized[i];
      for (const p of patterns) {
        if (typeof p === 'string' ? col === p || col.includes(p) : p.test(col)) {
          return headers[i];
        }
      }
    }
    return null;
  };

  return {
    date: findIdx(['transaction date', 'txn date', 'txndate', 'value date', 'booking date', 'posted date', 'date']),
    description: findIdx(['narration', 'particulars', 'description', 'remarks', 'payee', 'details', 'memo', 'transaction details']),
    debit: findIdx(['debit amount', 'withdrawal amount', 'dr amount', 'debit', 'withdrawal', 'dr', 'expense']),
    credit: findIdx(['credit amount', 'deposit amount', 'cr amount', 'credit', 'deposit', 'cr', 'income']),
    amount: findIdx(['net amount', 'txn amount', 'amount', 'total']),
    type: findIdx(['type', 'dr/cr', 'cr/dr', 'transaction type', 'd/c']),
    balance: findIdx(['closing balance', 'available balance', 'balance', 'bal']),
    refNo: findIdx(['chq/ref no', 'ref no', 'reference no', 'cheque no', 'utr', 'txn id', 'reference']),
  };
};

/**
 * Flexible date parser for bank statements:
 * Supports DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, MM/DD/YYYY, DD-MMM-YYYY (e.g. 24-Aug-2024).
 */
export const parseBankDate = (dateStr) => {
  if (!dateStr) return new Date();
  const trimmed = dateStr.trim();

  // 1. ISO format: 2025-01-30 or 2025/01/30
  if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Text month format: 24-Aug-2024, 24 Aug 2024, 24-August-2024
  const monthMap = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  const textMonthMatch = trimmed.match(/^(\d{1,2})[-/\s]+([a-zA-Z]{3,9})[-/\s]+(\d{2,4})$/);
  if (textMonthMatch) {
    const day = parseInt(textMonthMatch[1], 10);
    const monStr = textMonthMatch[2].slice(0, 3).toLowerCase();
    let year = parseInt(textMonthMatch[3], 10);
    if (year < 100) year += 2000;
    if (monthMap[monStr] !== undefined) {
      return new Date(year, monthMap[monStr], day);
    }
  }

  // 3. Indian / British format: DD/MM/YYYY or DD-MM-YYYY
  const partsMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (partsMatch) {
    const p1 = parseInt(partsMatch[1], 10);
    const p2 = parseInt(partsMatch[2], 10);
    let year = parseInt(partsMatch[3], 10);
    if (year < 100) year += 2000;

    // Usually p1 is day, p2 is month in Indian banks
    if (p1 > 12 && p2 <= 12) {
      return new Date(year, p2 - 1, p1);
    } else if (p2 > 12 && p1 <= 12) {
      return new Date(year, p1 - 1, p2);
    }
    // Default assumption: DD/MM/YYYY
    return new Date(year, p2 - 1, p1);
  }

  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
};

/**
 * Cleans numeric amounts from currency strings e.g. "₹ 1,450.50 Dr" -> 1450.50
 */
export const cleanNumericAmount = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return Math.abs(val);
  const clean = val.toString().replace(/[^0-9.-]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.abs(num);
};

/**
 * ⚡ Previews statement entries, detects duplicates, and auto-suggests categories.
 */
export const previewBankStatement = async ({ userId, csvContent, accountId, customMapping = null }) => {
  const { headers, rows } = parseCSVText(csvContent);
  if (headers.length === 0 || rows.length === 0) {
    throw new Error('CSV file is empty or could not be parsed.');
  }

  const mapping = customMapping || detectColumnMapping(headers);
  const userCategories = await Category.find({ user: userId }).lean();

  const getColVal = (row, colName) => {
    if (!colName) return '';
    const idx = headers.indexOf(colName);
    return idx >= 0 && row[idx] ? row[idx].trim() : '';
  };

  const parsedEntries = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawDate = getColVal(row, mapping.date);
    const rawDesc = getColVal(row, mapping.description);
    const rawDebit = getColVal(row, mapping.debit);
    const rawCredit = getColVal(row, mapping.credit);
    const rawAmount = getColVal(row, mapping.amount);
    const rawType = getColVal(row, mapping.type);
    const refNo = getColVal(row, mapping.refNo);

    if (!rawDate && !rawDesc && !rawAmount && !rawDebit && !rawCredit) {
      continue; // Skip empty row
    }

    const date = parseBankDate(rawDate);
    let amount = 0;
    let type = 'Expense';

    if (mapping.debit && mapping.credit) {
      const debitVal = cleanNumericAmount(rawDebit);
      const creditVal = cleanNumericAmount(rawCredit);
      if (debitVal > 0) {
        amount = debitVal;
        type = 'Expense';
      } else if (creditVal > 0) {
        amount = creditVal;
        type = 'Income';
      }
    } else if (mapping.amount) {
      amount = cleanNumericAmount(rawAmount);
      if (rawType) {
        const t = rawType.toLowerCase();
        if (t.includes('cr') || t.includes('credit') || t.includes('income') || t.includes('deposit')) {
          type = 'Income';
        } else {
          type = 'Expense';
        }
      }
    }

    if (amount <= 0) continue;

    // Run auto-categorization
    const catResult = categorizeMerchant(rawDesc, userCategories);

    parsedEntries.push({
      rowId: i + 1,
      date,
      formattedDate: date.toISOString().split('T')[0],
      amount,
      type,
      rawDescription: rawDesc,
      merchant: catResult.cleanMerchant || rawDesc,
      categoryName: catResult.categoryName,
      subcategoryName: catResult.subcategoryName,
      categoryId: catResult.categoryId,
      subcategoryId: catResult.subcategoryId,
      refNo: refNo || null,
      isAutoCategorized: catResult.isMatch,
      isDuplicate: false,
    });
  }

  // ⚡ Check for duplicates in existing database transactions within ±1 day
  if (parsedEntries.length > 0 && accountId) {
    const dates = parsedEntries.map((p) => p.date);
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())) - 86400000);
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())) + 86400000);

    const existingTxns = await Transaction.find({
      user: userId,
      account: accountId,
      date: { $gte: minDate, $lte: maxDate },
    }).lean();

    for (const entry of parsedEntries) {
      const entryTime = entry.date.getTime();
      const duplicateMatch = existingTxns.find((ex) => {
        const exTime = new Date(ex.date).getTime();
        const diffHours = Math.abs(entryTime - exTime) / (1000 * 60 * 60);
        const amountMatch = Math.abs(ex.amount - entry.amount) < 0.01;
        const typeMatch = ex.type === entry.type;

        return diffHours <= 36 && amountMatch && typeMatch;
      });

      if (duplicateMatch) {
        entry.isDuplicate = true;
        entry.duplicateReason = `Matches existing ${duplicateMatch.type} of ₹${duplicateMatch.amount} on ${new Date(duplicateMatch.date).toISOString().split('T')[0]}`;
      }
    }
  }

  const totalCount = parsedEntries.length;
  const duplicateCount = parsedEntries.filter((p) => p.isDuplicate).length;
  const validCount = totalCount - duplicateCount;
  const autoCategorizedCount = parsedEntries.filter((p) => p.isAutoCategorized && !p.isDuplicate).length;

  return {
    headers,
    detectedMapping: mapping,
    totalRows: totalCount,
    validCount,
    duplicateCount,
    autoCategorizedCount,
    entries: parsedEntries,
  };
};

/**
 * ⚡ Ingests verified bank statement transactions atomically into the database.
 */
export const ingestBankStatement = async ({ userId, accountId, transactions = [] }) => {
  if (!transactions || transactions.length === 0) {
    throw new Error('No transactions provided for ingestion.');
  }

  const account = await Account.findOne({ _id: accountId, user: userId });
  if (!account) throw new Error('Target account not found.');

  // Fetch or find fallback category
  const userCategories = await Category.find({ user: userId }).lean();
  const getCategoryId = (catName, type) => {
    if (!catName) return null;
    const match = userCategories.find(
      (c) => c.name.toLowerCase() === catName.toLowerCase() && c.type === type
    );
    return match ? match._id : null;
  };

  const fallbackExpenseCat = userCategories.find((c) => c.type === 'Expense')?._id;
  const fallbackIncomeCat = userCategories.find((c) => c.type === 'Income')?._id;

  const validEntriesToInsert = [];
  let netBalanceDelta = 0;
  let autoCategorizedCount = 0;
  const budgetAlerts = [];

  for (const item of transactions) {
    if (item.isDuplicate) continue;

    const type = item.type || 'Expense';
    const amount = cleanNumericAmount(item.amount);
    if (amount <= 0) continue;

    let categoryId = item.categoryId;
    if (!categoryId && item.categoryName) {
      categoryId = getCategoryId(item.categoryName, type);
    }
    if (!categoryId) {
      categoryId = type === 'Income' ? fallbackIncomeCat : fallbackExpenseCat;
    }

    if (item.isAutoCategorized) autoCategorizedCount++;

    const txnDoc = {
      user: userId,
      type,
      amount,
      date: item.date ? new Date(item.date) : new Date(),
      account: accountId,
      category: categoryId,
      subcategory: item.subcategoryId || null,
      merchant: item.merchant || item.rawDescription || 'Bank Import',
      notes: item.rawDescription ? `Imported: ${item.rawDescription}` : 'Bank Statement Import',
      tags: ['imported', 'statement', item.refNo ? `ref:${item.refNo}` : ''].filter(Boolean),
    };

    validEntriesToInsert.push(txnDoc);

    // Calculate balance delta
    if (type === 'Income') netBalanceDelta += amount;
    else if (type === 'Expense') netBalanceDelta -= amount;
  }

  if (validEntriesToInsert.length === 0) {
    return {
      success: true,
      importedCount: 0,
      skippedCount: transactions.length,
      message: 'All entries were skipped as duplicates or empty.',
      budgetAlerts: [],
    };
  }

  // 1. Batch insert transactions
  const insertedDocs = await Transaction.insertMany(validEntriesToInsert);

  // 2. Atomically update Account balance via $inc
  await Account.findByIdAndUpdate(accountId, { $inc: { currentBalance: netBalanceDelta } });

  // 3. Evaluate budget guardrails for inserted expense categories
  const touchedCategories = [...new Set(validEntriesToInsert.filter((t) => t.type === 'Expense').map((t) => t.category.toString()))];
  for (const catId of touchedCategories) {
    const alert = await checkBudgetGuardrails(userId, catId);
    if (alert && alert.triggered) {
      budgetAlerts.push(alert);
    }
  }

  return {
    success: true,
    importedCount: insertedDocs.length,
    skippedCount: transactions.length - insertedDocs.length,
    autoCategorizedCount,
    netBalanceDelta,
    message: `Successfully imported ${insertedDocs.length} transactions (${autoCategorizedCount} auto-categorized).`,
    budgetAlerts,
    transactions: insertedDocs,
  };
};
