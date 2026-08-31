/**
 * ⚡ Capise Client-side Real-time Merchant & Payee Auto-Categorizer
 * Matches payee / narration / notes against heuristic patterns instantly.
 */

export const CATEGORY_PATTERNS = [
  // 1. Food & Dining / Groceries / Delivery
  {
    category: 'Food',
    subcategory: 'Delivery',
    type: 'Expense',
    patterns: [
      /\b(swiggy|zomato|eats|foodpanda|box8|faasos|behrouz|ovenstory|freshmenu|eatclub)\b/i,
      /\b(instamart|blinkit|zepto|dunzo|bbdaily|bigbasket|grofers|country\s*delight)\b/i,
    ],
  },
  {
    category: 'Food',
    subcategory: 'Dining Out',
    type: 'Expense',
    patterns: [
      /\b(mcdonald|starbucks|domino|pizza\s*hut|kfc|burger\s*king|subway|taco\s*bell|haldiram|barbeque\s*nation|cafe\s*coffee\s*day|ccd|chai\s*point|chaayos|social|mainland\s*china|baskin\s*robbins|dunkin|costa\s*coffee|wendy)\b/i,
      /\b(restaurant|restro|bistro|dhaba|cafe|bakery|patisserie|pizzeria|brewery|bar|pub|kitchen|diner)\b/i,
    ],
  },
  {
    category: 'Food',
    subcategory: 'Groceries',
    type: 'Expense',
    patterns: [
      /\b(supermarket|hypermarket|dmart|d-mart|reliance\s*fresh|reliance\s*smart|nature'?s\s*basket|spencer|more\s*retail|spar|ratnadeep|easyday|kirana|grocer|vegetable|fruit)\b/i,
    ],
  },

  // 2. Transportation / Fuel / Cab / Travel
  {
    category: 'Transportation',
    subcategory: 'Fuel',
    type: 'Expense',
    patterns: [
      /\b(petrol|diesel|fuel|hpcl|bpcl|iocl|indian\s*oil|bharat\s*petroleum|hindustan\s*petroleum|shell\s*petrol|cng|gas\s*station)\b/i,
    ],
  },
  {
    category: 'Transportation',
    subcategory: 'Taxi',
    type: 'Expense',
    patterns: [
      /\b(uber|ola\s*cabs|ola\s*ride|rapido|blusmart|meru|auto\s*rickshaw|taxi|cab)\b/i,
    ],
  },
  {
    category: 'Transportation',
    subcategory: 'Public Transit',
    type: 'Expense',
    patterns: [
      /\b(irctc|indian\s*railway|metro|delhi\s*metro|dmrc|mumbai\s*metro|mmrcl|bmrc|namma\s*metro|redbus|abhibus|chalo|fastag|toll|nhai|iocl\s*fastag|paytm\s*fastag)\b/i,
      /\b(indigo|air\s*india|spicejet|vistara|akasa|airasia|makemytrip|cleartrip|yatra|easemytrip|goibibo|ixigo)\b/i,
    ],
  },

  // 3. Shopping / E-Commerce / Fashion / Electronics
  {
    category: 'Shopping',
    subcategory: 'Clothing',
    type: 'Expense',
    patterns: [
      /\b(myntra|ajio|zara|h&m|hnm|uniqlo|westside|pantaloons|max\s*fashion|trends|marks\s*and\s*spencer|nykaa|tira|snitch|zudio|fabindia|lifestyle)\b/i,
    ],
  },
  {
    category: 'Shopping',
    subcategory: 'Electronics',
    type: 'Expense',
    patterns: [
      /\b(croma|reliance\s*digital|vijay\s*sales|apple\s*store|samsung|boat|noise|oneplus|lenovo|dell|hp\s*world|gadget|poorvika|sangeetha)\b/i,
    ],
  },
  {
    category: 'Shopping',
    subcategory: 'Gifts',
    type: 'Expense',
    patterns: [
      /\b(amazon|flipkart|meesho|tata\s*cliq|tatacliq|ebay|etsy|decathlon|ikea|urban\s*ladder|pepperfry|hamleys|archies|fnp|ferns\s*n\s*petals)\b/i,
    ],
  },

  // 4. Utilities / Bills / Recharges
  {
    category: 'Utilities',
    subcategory: 'Phone',
    type: 'Expense',
    patterns: [
      /\b(airtel|jio|vi\s*bill|vodafone|idea\s*cellular|bsnl|mtnl|prepaid\s*recharge|postpaid)\b/i,
    ],
  },
  {
    category: 'Utilities',
    subcategory: 'Internet',
    type: 'Expense',
    patterns: [
      /\b(act\s*corp|act\s*fibernet|act\s*broadband|airtel\s*broadband|jio\s*fiber|hathway|you\s*broadband|spectra|excitel|tata\s*play\s*fiber)\b/i,
    ],
  },
  {
    category: 'Utilities',
    subcategory: 'Electricity',
    type: 'Expense',
    patterns: [
      /\b(electricity|bescom|tneb|msedcl|tata\s*power|adani\s*electricity|cesc|dhbvn|uppcl|wbbsdcl|torrent\s*power|power\s*distribution)\b/i,
    ],
  },
  {
    category: 'Utilities',
    subcategory: 'Gas',
    type: 'Expense',
    patterns: [
      /\b(indane|bharat\s*gas|hp\s*gas|lpg|mahanagar\s*gas|mgl|igl|indraprastha\s*gas|piped\s*gas|adani\s*gas)\b/i,
    ],
  },
  {
    category: 'Utilities',
    subcategory: 'Water',
    type: 'Expense',
    patterns: [
      /\b(water\s*board|jal\s*board|bwssb|mcgm\s*water|water\s*tax|water\s*tanker)\b/i,
    ],
  },

  // 5. Entertainment & Subscriptions
  {
    category: 'Entertainment',
    subcategory: 'Subscriptions',
    type: 'Expense',
    patterns: [
      /\b(netflix|spotify|prime\s*video|disney|hotstar|youtube\s*premium|apple\s*music|sony\s*liv|sonyliv|zee5|jiocinema|audible|kindle|gaana|wynk|jiosaavn|chatgpt|openai|cursor|github)\b/i,
    ],
  },
  {
    category: 'Entertainment',
    subcategory: 'Movies',
    type: 'Expense',
    patterns: [
      /\b(bookmyshow|pvr|inox|cinepolis|carnival\s*cinemas|movie|cinema|theatre)\b/i,
    ],
  },
  {
    category: 'Entertainment',
    subcategory: 'Games',
    type: 'Expense',
    patterns: [
      /\b(steam|playstation|psn|xbox|nintendo|epic\s*games|riot\s*games|ubisoft|krafton|battlegrounds)\b/i,
    ],
  },

  // 6. Healthcare / Pharmacy / Fitness
  {
    category: 'Healthcare',
    subcategory: 'Pharmacy',
    type: 'Expense',
    patterns: [
      /\b(apollo\s*pharmacy|pharmeasy|1mg|tata\s*1mg|netmeds|medplus|wellness\s*forever|chemist|druggist|pharmacy)\b/i,
    ],
  },
  {
    category: 'Healthcare',
    subcategory: 'Doctor',
    type: 'Expense',
    patterns: [
      /\b(practo|hospital|clinic|dr\.|doctor|max\s*healthcare|fortis|manipal|apollo\s*hospital|diagnostic|lal\s*pathlabs|metropolis|thyrocare|dental|dentist)\b/i,
    ],
  },
  {
    category: 'Healthcare',
    subcategory: 'Fitness',
    type: 'Expense',
    patterns: [
      /\b(cult\.fit|cultfit|curefit|gold'?s\s*gym|anytime\s*fitness|fitness\s*first|gym|crossfit|yoga|pilates|sports)\b/i,
    ],
  },

  // 7. Housing / Rent / Services
  {
    category: 'Housing',
    subcategory: 'Rent',
    type: 'Expense',
    patterns: [
      /\b(house\s*rent|rent\s*payment|nobroker|nestaway|stanzaliving|landlord|flat\s*rent)\b/i,
    ],
  },
  {
    category: 'Housing',
    subcategory: 'Maintenance',
    type: 'Expense',
    patterns: [
      /\b(mygate|apnacomplex|nobrokerhood|society\s*maintenance|maintenance\s*charge|urban\s*company|urbanclap|carpenter|plumber|electrician|cleaning)\b/i,
    ],
  },

  // 8. Education
  {
    category: 'Education',
    subcategory: 'Courses',
    type: 'Expense',
    patterns: [
      /\b(coursera|udemy|edx|unacademy|byju|vedantu|simplilearn|upgrad|scaler|coding\s*ninjas|skillshare|duolingo|masterclass)\b/i,
      /\b(school\s*fee|college\s*fee|university|tuition|institute|exam\s*fee)\b/i,
    ],
  },

  // 9. Income & Salary / Dividends / Refunds
  {
    category: 'Salary',
    subcategory: 'Base Pay',
    type: 'Income',
    patterns: [
      /\b(salary|payroll|pay\s*slip|direct\s*deposit|stipend|wages|employer|remuneration)\b/i,
    ],
  },
  {
    category: 'Investments',
    subcategory: 'Dividends',
    type: 'Income',
    patterns: [
      /\b(dividend|interest\s*credit|savings\s*interest|fd\s*interest|capital\s*gain|cdsl|nsdl|groww|zerodha|coin)\b/i,
    ],
  },
  {
    category: 'Other Income',
    subcategory: 'Refunds',
    type: 'Income',
    patterns: [
      /\b(refund|cashback|reward|reversal|settlement|upi\s*cashback|credo\s*reward)\b/i,
    ],
  },
];

export const cleanMerchantNarration = (rawText = '') => {
  if (!rawText || typeof rawText !== 'string') return '';
  return rawText
    .replace(/^(UPI|POS|NEFT|IMPS|RTGS|ACH|ATM|NACH|INB|INF|BIL)\s*[\/\-:]?\s*/i, '')
    .replace(/^(CR|DR|REV)\s*[\/\-:]?\s*[a-zA-Z0-9_-]+\s*[\/\-:]?\s*/i, '')
    .replace(/@[a-zA-Z0-9._-]+/g, '')
    .replace(/\b(P2A|P2M|P2P|BIL|INB|VPS|NODAL|MERCHANT|PVT|LTD|LIMITED|PAYMENT|TRANSFER)\b/gi, ' ')
    .replace(/\b\d{6,}\b/g, '')
    .replace(/[^a-zA-Z0-9\s&'.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || rawText.trim();
};

export const suggestCategoryForInput = (text, userCategories = []) => {
  if (!text || !text.trim()) return null;
  const clean = cleanMerchantNarration(text);
  const searchable = `${text} ${clean}`;

  for (const rule of CATEGORY_PATTERNS) {
    for (const pattern of rule.patterns) {
      if (pattern.test(searchable)) {
        const matchedParent = userCategories.find(
          c => !c.parent && c.name.toLowerCase() === rule.category.toLowerCase()
        );

        let matchedSub = null;
        if (matchedParent && rule.subcategory) {
          matchedSub = userCategories.find(
            c => c.parent && (c.parent._id || c.parent).toString() === matchedParent._id.toString() &&
                 c.name.toLowerCase() === rule.subcategory.toLowerCase()
          );
        }

        return {
          categoryName: rule.category,
          subcategoryName: rule.subcategory,
          type: rule.type,
          categoryId: matchedParent ? matchedParent._id : null,
          subcategoryId: matchedSub ? matchedSub._id : null,
          matchedCategoryObj: matchedParent || null,
        };
      }
    }
  }
  return null;
};
