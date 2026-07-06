export async function callGeminiAPI<T>(prompt: string, schema: any): Promise<T | null> {
 let chatHistory = [];
 chatHistory.push({ role:"user", parts: [{ text: prompt }] });
 const payload = {
 contents: chatHistory,
 generationConfig: {
 responseMimeType:"application/json",
 responseSchema: schema
 }
 };
 const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY ||""; // Get from environment variable
 const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

 try {
 const response = await fetch(apiUrl, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(payload)
 });
 const result = await response.json();

 if (result.candidates && result.candidates.length > 0 &&
 result.candidates[0].content && result.candidates[0].content.parts &&
 result.candidates[0].content.parts.length > 0) {
 const jsonString = result.candidates[0].content.parts[0].text;
 return JSON.parse(jsonString) as T;
 } else {
 console.error("Gemini API returned an unexpected structure:", result);
 return null;
 }
 } catch (error) {
 console.error("Error calling Gemini API:", error);
 return null;
 }
} 