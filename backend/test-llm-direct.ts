import 'dotenv/config';
import { llmService } from './src/services/llm.service';

async function test() {
    console.log("Starting direct LLM test...");
    try {
        const res = await llmService.complete("You are a helpful assistant", "Say hello");
        console.log("Response:", res);
    } catch (err: any) {
        console.error("Direct Test Error:", err.message);
    }
}

test();
