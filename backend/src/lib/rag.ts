import OpenAI from "openai";
import {pinecone} from "./pinecone";
import * as dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

export async function askResume(question: string): Promise<string> {
    const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: question,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    const index = pinecone.index(process.env.PINECONE_INDEX!);
    const queryResponse = await index.query({
        vector: queryEmbedding,
        topK: 5,
        includeMetadata: true,
    } as any);

    const context = queryResponse.matches
        ?.map((match: any) => match.metadata?.text ?? "")
        .join("\n") ?? "";

    const chatResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            {
                role: "system",
                content:
                    "You are a helpful assistant. Only answer using the provided resume context.",
            },
            {
                role: "user",
                content: `Context:\n${context}\n\nQuestion:\n${question}`,
            },
        ],
    });
    return chatResponse.choices[0].message.content ?? "No answer found.";
}