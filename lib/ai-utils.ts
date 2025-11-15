/**
 * AI Abstraction Layer for Payment Metadata Generation
 * 
 * This utility handles the extraction of payment intent from natural language
 * and generates structured metadata for cross-chain stablecoin payments.
 */

export type PaymentMetadata = {
  purpose: string; // e.g., "Sushi Dinner Repayment"
  timestamp: string;
  recipient: string;
  amount: string;
  web3TxType: 'CrossChainStablecoinSwap';
};

/**
 * Generates payment metadata from natural language input
 * 
 * @param userInput - Natural language payment request (e.g., "Pay John $50 for rent on Polygon")
 * @param recipientAddress - Optional recipient wallet address (can be extracted from input)
 * @param amount - Optional amount (can be extracted from input)
 * @returns Promise<PaymentMetadata> - Structured payment metadata
 * 
 * TODO: Replace mock logic with actual OpenAI API call:
 * - Use openai.chat.completions.create() or fetch to custom OpenAI backend
 * - Send userInput with structured output schema
 * - Parse and validate the AI response
 */
export async function generatePaymentMetadata(
  userInput: string,
  recipientAddress?: string,
  amount?: string
): Promise<PaymentMetadata> {
  // Mock OpenAI logic - Simple pattern matching for demonstration
  // In production, this would call OpenAI API with structured output
  
  const input = userInput.toLowerCase();
  let purpose = "Payment";
  let extractedAmount = amount || "0";
  let extractedRecipient = recipientAddress || "0x0000000000000000000000000000000000000000";
  
  // Extract amount (look for $XX or XX USD patterns)
  const amountMatch = userInput.match(/\$?(\d+(?:\.\d+)?)/);
  if (amountMatch && !amount) {
    extractedAmount = amountMatch[1];
  }
  
  // Extract recipient (look for common patterns)
  const recipientMatch = userInput.match(/pay\s+(\w+)/i) || userInput.match(/to\s+(\w+)/i);
  if (recipientMatch && !recipientAddress) {
    extractedRecipient = recipientMatch[1];
  }
  
  // Categorize purpose based on keywords
  if (input.includes('rent') || input.includes('lease')) {
    purpose = "Monthly Rent Payment";
  } else if (input.includes('dinner') || input.includes('food') || input.includes('sushi')) {
    purpose = "Sushi Dinner Repayment";
  } else if (input.includes('coffee') || input.includes('cafe')) {
    purpose = "Coffee Payment";
  } else if (input.includes('uber') || input.includes('ride') || input.includes('taxi')) {
    purpose = "Ride Share Payment";
  } else if (input.includes('groceries') || input.includes('grocery')) {
    purpose = "Grocery Payment";
  } else if (input.includes('repay') || input.includes('repayment')) {
    purpose = "Debt Repayment";
  } else if (input.includes('salary') || input.includes('wage')) {
    purpose = "Salary Payment";
  } else if (input.includes('invoice') || input.includes('bill')) {
    purpose = "Invoice Payment";
  } else {
    purpose = "General Payment";
  }
  
  return {
    purpose,
    timestamp: new Date().toISOString(),
    recipient: extractedRecipient,
    amount: extractedAmount,
    web3TxType: 'CrossChainStablecoinSwap',
  };
}

