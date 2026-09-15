import { WebWorkerMLCEngineHandler } from "https://esm.run/@mlc-ai/web-llm@0.2.84";

const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (message) => {
    console.log("webLLMWorker: message received:", message.data);
    handler.onmessage(message);
};
