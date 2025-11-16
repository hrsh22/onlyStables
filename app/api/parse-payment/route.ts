import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { userInput } = await request.json();

        if (!userInput || typeof userInput !== "string") {
            return NextResponse.json(
                { error: "Invalid input. Please provide a userInput string." },
                { status: 400 }
            );
        }

        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
            return NextResponse.json(
                { error: "OpenAI API key not configured" },
                { status: 500 }
            );
        }

        // Call OpenAI API with structured output
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openaiApiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are an expert payment parsing assistant. Your job is to extract payment details from natural language and return structured JSON.

CRITICAL INSTRUCTIONS:
1. Extract the recipient Ethereum address (must start with 0x and be 42 characters)
2. Extract the amount as a number (can be decimal like 5.5 or whole number like 5)
3. Extract the token symbol - ONLY USDT is supported
4. Extract the destination blockchain chain name
5. Extract any payment purpose/note/description (e.g., "for rent", "payment for services", "dinner payment", etc.) - this is OPTIONAL

AVAILABLE CHAINS (use these lowercase identifiers when the user references an equivalent term):
- base (Base)
- avalanche (Avalanche / Avax)
- arbitrum (Arbitrum One)
- optimism (Optimism)
- ethereum (Ethereum mainnet / ETH)
- bnb (BNB Smart Chain / Binance Smart Chain / BSC)
- filecoin (Filecoin)
- linea (Linea)
- scroll (Scroll)

IMPORTANT: If the user explicitly mentions a destination chain that is NOT in this list (e.g., polygon, solana, etc.), set "destinationChain" to that lowercase name exactly as provided so downstream logic can respond with "unsupported chain". Only default to "base" when the user does not mention any chain at all.

AVAILABLE TOKEN (only one token is supported):
- USDT (6 decimals)

EXAMPLES OF USER INPUTS AND EXPECTED OUTPUTS:

Example 1:
Input: "send 0xce1770953208a6c61a30d5205e3a74e8af4a226e 5 USDT on base chain"
Output: {"recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", "amount": "5", "token": "USDT", "destinationChain": "base", "purpose": null}

Example 2:
Input: "Pay 0x1234567890123456789012345678901234567890 10.5 USDT to avalanche for rent"
Output: {"recipient": "0x1234567890123456789012345678901234567890", "amount": "10.5", "token": "USDT", "destinationChain": "avalanche", "purpose": "for rent"}

Example 3:
Input: "Transfer 100 USDT to address 0xabcdefabcdefabcdefabcdefabcdefabcdefabcd on avalanche payment for services"
Output: {"recipient": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", "amount": "100", "token": "USDT", "destinationChain": "avalanche", "purpose": "payment for services"}

Example 4:
Input: "Send 0x1111111111111111111111111111111111111111 2.5 USDT on arbitrum network for dinner"
Output: {"recipient": "0x1111111111111111111111111111111111111111", "amount": "2.5", "token": "USDT", "destinationChain": "arbitrum", "purpose": "for dinner"}

Example 5:
Input: "I want to send 50 USDT to 0x2222222222222222222222222222222222222222 on Base"
Output: {"recipient": "0x2222222222222222222222222222222222222222", "amount": "50", "token": "USDT", "destinationChain": "base", "purpose": null}

Example 6:
Input: "Send 0x3333333333333333333333333333333333333333 25 USDT on arbitrum monthly subscription payment"
Output: {"recipient": "0x3333333333333333333333333333333333333333", "amount": "25", "token": "USDT", "destinationChain": "arbitrum", "purpose": "monthly subscription payment"}

Example 7:
Input: "send 100 USDT to 0x4444444444444444444444444444444444444444 on base"
Output: {"recipient": "0x4444444444444444444444444444444444444444", "amount": "100", "token": "USDT", "destinationChain": "base", "purpose": null}

Example 8:
Input: "Pay 0x5991fd6ecc5634c4de497b47eb0aa0065fffb2141 usd for coffee"
Output: {"recipient": "0x5991fd6ecc5634c4de497b47eb0aa0065fffb2141", "amount": null, "token": "USDT", "destinationChain": "base", "purpose": "for coffee"}

Example 9:
Input: "Send 50 to 0x1234567890123456789012345678901234567890"
Output: {"recipient": "0x1234567890123456789012345678901234567890", "amount": "50", "token": "USDT", "destinationChain": "base", "purpose": null}

Example 10:
Input: "Pay 0xabcdefabcdefabcdefabcdefabcdefabcdefabcd 100 USD"
Output: {"recipient": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", "amount": "100", "token": "USDT", "destinationChain": "base", "purpose": null}

PARSING RULES:
- CRITICAL: Look carefully for Ethereum addresses - they start with "0x" followed by exactly 40 hexadecimal characters (0-9, a-f, A-F)
- Addresses can appear anywhere in the message: beginning, middle, or end
- Address format: 0x followed by 40 hex characters (total 42 characters including "0x")
- Examples of valid addresses: 0x5991fd6ecc5634c4de497b47eb0aa0065fffb2141, 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
- Extract numbers that appear before or after token name or address
- Token is ALWAYS USDT - if user says "usd", "USD", "dollar", "dollars" or doesn't specify token, default to USDT
- Token can be in any case (usdt, USDT, Usdt, usd, USD) but return uppercase "USDT"
- Chain names can be "base", "base chain", "Base network", "Base" - normalize to lowercase "base"
- If chain is not specified, try to infer from context or default to "base" if unclear
- Extract payment purpose/note: Look for phrases like "for rent", "for dinner", "for coffee", "payment for", "subscription", "services", etc. after the main payment details
- Purpose is OPTIONAL - if no purpose is mentioned, return null
- If amount is not specified, return null
- If recipient address is not found or invalid, return null
- ALWAYS return "USDT" as the token (even if user doesn't mention it or mentions another token like "USD")

RETURN FORMAT (JSON object):
{
  "recipient": "0x...", // Ethereum address or null
  "amount": "5", // Number as string or null
  "token": "USDT", // Always "USDT"
  "destinationChain": "base", // Chain name or null
  "purpose": "for rent" // Payment purpose/note as string or null if not mentioned
}

IMPORTANT: Return ONLY valid JSON. Do not include any explanations or additional text.`
                    },
                    {
                        role: "user",
                        content: userInput
                    }
                ],
                response_format: { type: "json_object" },
                temperature: 0.1
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("OpenAI API error:", errorData);
            return NextResponse.json(
                { error: "Failed to parse input with AI", details: errorData },
                { status: response.status }
            );
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
            return NextResponse.json(
                { error: "No response from AI model" },
                { status: 500 }
            );
        }

        let parsedContent;
        try {
            // Try to parse as JSON
            parsedContent = typeof content === "string" ? JSON.parse(content) : content;
        } catch (parseError) {
            console.error("Failed to parse AI response as JSON:", content);
            return NextResponse.json(
                { error: "AI returned invalid JSON format", rawResponse: content },
                { status: 500 }
            );
        }

        // Validate the structure
        if (!parsedContent || typeof parsedContent !== "object") {
            return NextResponse.json(
                { error: "Invalid response structure from AI" },
                { status: 500 }
            );
        }

        console.log("Successfully parsed payment data:", parsedContent);

        return NextResponse.json({
            success: true,
            data: parsedContent
        });
    } catch (error) {
        console.error("Parse payment error:", error);
        return NextResponse.json(
            {
                error: "Internal server error",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}

