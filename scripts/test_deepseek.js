// Native fetch
const API_KEY = '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';

async function testDeepSeek() {
    console.log("Testing DeepSeek on OpenRouter...");
    const models = [
        "deepseek/deepseek-chat", // Standard V3 (likely what they want)
        "deepseek/deepseek-r1",   // Reasoner
    ];

    for (const model of models) {
        console.log(`\nTesting Model: ${model}`);
        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${API_KEY}`,
                    "Content-Type": "application/json"
                    // "HTTP-Referer": "http://localhost:3000", // Required by OpenRouter sometimes
                },
                body: JSON.stringify({
                    "model": model,
                    "messages": [
                        { "role": "user", "content": "Return JSON: {\"status\": \"ok\"}" }
                    ]
                })
            });

            if (!response.ok) {
                const err = await response.text();
                console.log(`❌ Failed: ${response.status} - ${err}`);
                continue;
            }

            const data = await response.json();
            console.log("✅ Success!");
            console.log("Response:", data.choices[0].message.content);
            return; // Stop on first success
        } catch (error) {
            console.error("❌ Network Fail:", error.message);
        }
    }
}

testDeepSeek();
