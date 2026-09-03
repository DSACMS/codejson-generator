// WebLLM lifecycle: capability detection, lazy library load, model download
(function () {

    const LIBRARY_URL = "https://esm.run/@mlc-ai/web-llm@0.2.84";
    const FALLBACK_LIBRARY_URL = "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.84/+esm";
    const CACHE_MARKER_KEY = "aiPrefill.cachedModel";

    const MODEL = {
        id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
        sizeMB: 879,
        readmeChars: 6000,
        proseMaxTokens: 200
    };

    let library = null;
    let engine = null;
    let worker = null;
    let abortLoad = null;
    let cancelled = false;

    // WebGPU needs a secure context, so this is false on a LAN IP even in Chrome
    async function isSupported() {
        if (!navigator.gpu) {
            return { ok: false, reason: "no-webgpu" };
        }

        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                return { ok: false, reason: "no-adapter" };
            }
            return { ok: true, adapter };
        } catch (error) {
            return { ok: false, reason: "no-adapter" };
        }
    }

    async function loadLibrary() {
        if (library) {
            return library;
        }

        try {
            library = await import(LIBRARY_URL);
        } catch (error) {
            console.warn("esm.run import failed, trying jsdelivr:", error);
            library = await import(FALLBACK_LIBRARY_URL);
        }

        return library;
    }

    function isModelCached() {
        try {
            return localStorage.getItem(CACHE_MARKER_KEY) === MODEL.id;
        } catch (error) {
            return false;
        }
    }

    function markCached() {
        try {
            localStorage.setItem(CACHE_MARKER_KEY, MODEL.id);
        } catch (error) {
        }
    }

    async function clearCache() {
        const names = await caches.keys();

        await Promise.all(
            names.filter((name) => name.startsWith("webllm")).map((name) => caches.delete(name))
        );

        try {
            localStorage.removeItem(CACHE_MARKER_KEY);
        } catch (error) {
        }

        engine = null;

        if (worker) {
            worker.terminate();
            worker = null;
        }
    }

    async function hasRoomFor() {
        if (!navigator.storage || !navigator.storage.estimate) {
            return true;
        }

        try {
            const { quota } = await navigator.storage.estimate();
            if (!quota) {
                return true;
            }
            return quota > MODEL.sizeMB * 1.4 * 1e6;
        } catch (error) {
            return true;
        }
    }

    function workerURL() {
        return new URL("js/ai/webLLMWorker.js", document.baseURI);
    }

    // loads the model, reusing the engine if it is already resident. Racing
    async function load(onProgress) {
        cancelled = false;

        if (engine) {
            return engine;
        }

        const webllm = await loadLibrary();
        const initProgressCallback = (report) => onProgress(report);
        const aborted = new Promise((resolve, reject) => {
            abortLoad = reject;
        });

        try {
            worker = new Worker(workerURL(), { type: "module" });
            engine = await Promise.race([
                webllm.CreateWebWorkerMLCEngine(worker, MODEL.id, { initProgressCallback }),
                aborted
            ]);
        } catch (error) {
            if (cancelled) {
                throw error;
            }

            console.warn("Worker engine failed, falling back to the main thread:", error);

            if (worker) {
                worker.terminate();
                worker = null;
            }

            engine = await Promise.race([
                webllm.CreateMLCEngine(MODEL.id, { initProgressCallback }),
                aborted
            ]);
        }

        abortLoad = null;
        markCached();

        return engine;
    }

    function cancel() {
        cancelled = true;

        if (abortLoad) {
            abortLoad(new DOMException("Aborted", "AbortError"));
            abortLoad = null;
        }

        if (worker) {
            worker.terminate();
            worker = null;
        }

        engine = null;
    }

    function isCancelled() {
        return cancelled;
    }

    const MAX_PROSE_CHARS = 3000;

    async function stopGenerating() {
        if (typeof engine.interruptGenerate === "function") {
            try {
                await engine.interruptGenerate();
            } catch (error) {
                // Already stopped
            }
        }
    }

    async function complete(messages, schema, options) {
        const response = await engine.chat.completions.create({
            messages,
            response_format: { type: "json_object", schema: JSON.stringify(schema) },
            temperature: options.temperature,
            max_tokens: options.maxTokens
        });

        const content = response.choices[0].message.content;

        try {
            return JSON.parse(content);
        } catch (error) {
            throw new Error("the model returned incomplete JSON");
        }
    }

    async function completeStreamingText(messages, options, onToken) {
        const stream = await engine.chat.completions.create({
            messages,
            stream: true,
            temperature: options.temperature,
            max_tokens: options.maxTokens
        });

        let accumulated = "";

        for await (const chunk of stream) {
            if (cancelled) {
                await stopGenerating();
                return null;
            }

            accumulated += chunk.choices[0]?.delta?.content || "";
            onToken(accumulated);

            if (accumulated.length > MAX_PROSE_CHARS) {
                await stopGenerating();
                break;
            }
        }

        return accumulated;
    }

    window.AIEngine = {
        MODEL,
        isSupported,
        hasRoomFor,
        isModelCached,
        clearCache,
        load,
        cancel,
        isCancelled,
        complete,
        completeStreamingText
    };
})();
