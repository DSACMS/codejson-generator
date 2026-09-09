// orchestrates AI-assisted field suggestions
(function () {
    const AI_FIELDS = {
        prose: ["longDescription"],
        classify: [
            "status", "softwareType", "repositoryType", "maintenance", "platforms",
            "userType", "subsetInHealthcare", "localisation", "userInput", "maturityModelTier"
        ],
        categories: ["categories"]
    };

    const NEVER_TOUCH = new Set([
        "group", "projects", "systems", "fismaLevel", "contractNumber", "AIUseCaseID",
        "laborHours", "disclaimerText", "disclaimerURL",
        "permissions", "organization", "repositoryURL", "repositoryVisibility",
        "repositoryHost", "vcs", "name", "description", "languages", "tags", "date",
        "reuseFrequency", "SBOM", "feedbackMechanism"
    ]);

    const PUBLICCODE_CATEGORIES = [
        "accounting", "agile-project-management", "applicant-tracking", "application-development",
        "appointment-scheduling", "backup", "billing-and-invoicing", "blog", "budgeting",
        "business-intelligence", "business-process-management", "cad", "call-center-management",
        "cloud-management", "collaboration", "communications", "compliance-management",
        "contact-management", "content-management", "crm", "customer-service-and-support",
        "data-analytics", "data-collection", "data-visualization", "design", "design-system",
        "digital-asset-management", "digital-citizenship", "document-management", "donor-management",
        "e-commerce", "e-signature", "educational-content", "email-management", "email-marketing",
        "employee-management", "enterprise-project-management", "enterprise-social-networking",
        "erp", "event-management", "facility-management", "feedback-and-reviews-management",
        "financial-reporting", "fleet-management", "fundraising", "gamification",
        "geographic-information-systems", "grant-management", "graphic-design", "help-desk", "hr",
        "ide", "identity-management", "instant-messaging", "integrated-library-system",
        "inventory-management", "it-asset-management", "it-development", "it-management",
        "it-security", "it-service-management", "knowledge-management", "learning-management-system",
        "marketing", "mind-mapping", "mobile-marketing", "mobile-payment", "network-management",
        "office", "online-booking", "online-community", "payment-gateway", "payroll",
        "predictive-analysis", "procurement", "productivity-suite", "project-collaboration",
        "project-management", "property-management", "real-estate-management",
        "regulations-and-directives", "remote-support", "resource-management", "sales-management",
        "seo", "service-desk", "social-media-management", "survey", "talent-management",
        "task-management", "taxes-management", "test-management", "time-management",
        "time-tracking", "translation", "video-conferencing", "video-editing", "visitor-management",
        "voip", "warehouse-management", "web-collaboration", "web-conferencing", "website-builder",
        "whistleblowing", "workflow-management", "other"
    ];

    const SYSTEM_PROMPT =
        "You are a metadata assistant. You classify a software repository and write short " +
        "factual descriptions of it for a US government software inventory (code.json). " +
        "Use ONLY facts present in the CONTEXT. Never invent URLs, people, versions, metrics " +
        "or agency names. If the context does not support a value, choose the most " +
        "conservative option. Reply with JSON only, no commentary.";

    const EXTRA_GUIDANCE = [
        "Extra guidance:",
        "- status: archived -> \"Archival\"; a release tagged >= 1.0.0 or a live homepage ->",
        "  \"Production\"; only 0.x releases -> \"Beta\"; no releases but pushed in the last 90",
        "  days -> \"Development\"; no releases and no push in 12 months -> \"Ideation\".",
        "- maturityModelTier: 0 = no README; 1 = README + LICENSE; 2 = also CONTRIBUTING and",
        "  CODE_OF_CONDUCT; 3 = also SECURITY, MAINTAINERS or GOVERNANCE plus CI workflows;",
        "  4 = also community docs, a roadmap and public meetings. Use the Root files list.",
        "- subsetInHealthcare: leave the array empty unless the context explicitly mentions",
        "  Medicare, Medicaid, health policy or healthcare operations.",
        "- localisation: true only if the context mentions translations, i18n or multiple languages."
    ].join("\n");

    let schema = null;
    let context = null;
    let busy = false;
    let modelAvailable = false;
    const attempted = new Set();
    const CLEAR_CACHE_FLASH_MS = 1200;

    // ---- schema derivation -------------------------------------------------

    function currentPage() {
        const params = new URLSearchParams(window.location.search);
        return params.get("page") || "gov";
    }

    function schemaFor(key) {
        const [head, tail] = key.split(".");
        const parent = schema.properties[head];

        if (!parent) {
            return null;
        }

        return tail ? (parent.properties || {})[tail] || null : parent;
    }

    function stripToGrammar(field) {
        if (field.type === "array") {
            return { type: "array", items: stripToGrammar(field.items), maxItems: 4 };
        }

        const stripped = { type: Array.isArray(field.type) ? "string" : field.type };

        if (field.enum) {
            stripped.enum = field.enum;
        }

        return stripped;
    }

    function subSchemaFor(keys, extraProperties) {
        const properties = Object.assign({}, extraProperties);

        for (const key of keys) {
            if (NEVER_TOUCH.has(key.split(".")[0])) {
                continue;
            }

            const field = schemaFor(key);
            if (!field) {
                continue;
            }

            properties[key] = stripToGrammar(field);
        }

        return {
            type: "object",
            properties,
            required: Object.keys(properties),
            additionalProperties: false
        };
    }

    function fieldGuidance(keys) {
        return keys
            .filter((key) => schemaFor(key))
            .map((key) => {
                const field = schemaFor(key);
                const options = field.enum || (field.items && field.items.enum);
                const choices = options
                    ? `\n  choose from: ${options.join(" | ")}`
                    : "\n  answer true or false";

                return `- ${key}: ${field.description || ""}${choices}`;
            })
            .join("\n");
    }

    // ---- validation --------------------------------------------------------

    function validateValue(field, value) {
        const fail = (why) => ({ ok: false, why });

        if (field.enum) {
            const normalised = field.type === "integer" ? Number(value) : value;
            return field.enum.includes(normalised)
                ? { ok: true, value: normalised }
                : fail(`"${value}" is not one of ${field.enum.join(", ")}`);
        }

        if (field.type === "array") {
            if (!Array.isArray(value)) {
                return fail("expected an array");
            }

            const allowed = field.items && field.items.enum;
            const unique = [...new Set(value.map((entry) => String(entry).trim()).filter(Boolean))];

            if (!allowed) {
                return unique.length ? { ok: true, value: unique.slice(0, 8) } : fail("empty");
            }

            const kept = unique.filter((entry) => allowed.includes(entry));
            const dropped = unique.filter((entry) => !allowed.includes(entry));

            return kept.length
                ? { ok: true, value: kept, dropped }
                : fail("no valid options returned");
        }

        if (field.type === "boolean") {
            if (typeof value === "boolean") {
                return { ok: true, value };
            }
            if (value === "true" || value === "false") {
                return { ok: true, value: value === "true" };
            }
            return fail("expected true or false");
        }

        if (field.type === "number" || field.type === "integer") {
            const numeric = Number(value);
            return Number.isFinite(numeric) ? { ok: true, value: numeric } : fail("not a number");
        }

        let text = String(value).replace(/\s+/g, " ").trim();

        if (!text) {
            return fail("empty");
        }
        if (field.format === "uri" && !/^https?:\/\//i.test(text)) {
            return fail("not a URL");
        }
        if (field.format === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text)) {
            return fail("not an email address");
        }
        if (field.maxLength) {
            text = text.slice(0, field.maxLength);
        }

        const warn = field.minLength && text.length < field.minLength
            ? `below the ${field.minLength}-character minimum`
            : undefined;

        return { ok: true, value: text, warn };
    }

    // ---- form.io interop ---------------------------------------------------

    function toWidgetValue(field, value) {
        switch (determineType(field)) {
            case "selectboxes": {
                const dictionary = {};
                for (const option of field.items.enum) {
                    dictionary[option] = false;
                }
                for (const entry of value) {
                    if (Object.prototype.hasOwnProperty.call(dictionary, entry)) {
                        dictionary[entry] = true;
                    }
                }
                return dictionary;
            }
            case "select-boolean":
                return value === true || value === "true" ? "true" : "false";
            case "radio":
                return String(value);
            case "tags":
                return Array.isArray(value) ? value : [];
            case "number":
            case "integer":
                return Number(value);
            default:
                return value;
        }
    }

    function isFieldEmpty(key) {
        const form = window.formIOInstance;
        const [head, tail] = key.split(".");
        const component = form.getComponent(head);

        if (!component) {
            return false;
        }

        const current = component.getValue();
        const value = tail ? (current || {})[tail] : current;

        if (value === null || value === undefined || value === "") {
            return true;
        }
        if (Array.isArray(value)) {
            return !value.length;
        }
        if (typeof value === "object") {
            return Object.values(value).every((entry) => !entry);
        }

        return false;
    }

    function setSchemaValue(key, value) {
        const form = window.formIOInstance;
        const [head, tail] = key.split(".");
        const component = form.getComponent(head);

        if (!component) {
            throw new Error(`no component "${head}"`);
        }

        if (!tail) {
            component.setValue(value);
            return;
        }

        const current = component.getValue() || {};
        current[tail] = value;
        component.setValue(current);
    }

    // ---- prompts -----------------------------------------------------------

    function baseMessages() {
        const readme = window.AIContext.condenseReadme(context.readme, window.AIEngine.MODEL.readmeChars);

        return [
            { role: "system", content: SYSTEM_PROMPT },
            {
                role: "user",
                content: `CONTEXT\n=======\n${context.facts}\n\nREADME (condensed)\n==================\n${readme}`
            }
        ];
    }

    const PROSE_TASK = [
        "Write the \"longDescription\" field for this repository's code.json entry.",
        "",
        "Requirements:",
        "- Exactly 2 or 3 sentences, between 150 and 400 characters. Be concise.",
        "- Plain prose. No markdown, no bullet lists, no repetition.",
        "- Say what the software does and who would use it. Nothing else.",
        "- Use only facts from the CONTEXT above. Do not invent features, agencies, URLs,",
        "  people or metrics. Do not mention this prompt.",
        "- Do not start with \"This repository\" - or the project name.",
        "- Do not copy headings, titles, underlines or any other formatting from the README.",
        "- Reply with the description only. No preamble, no heading, no quotation marks."
    ].join("\n");

    function stripArtifacts(text) {
        return String(text || "")
            .replace(/^\s*[^\n]{0,60}\r?\n[=\-]{3,}[^\n]*\r?\n/, "")
            .replace(/^\s*#{1,6}\s+[^\n]{0,80}\r?\n/, "")
            .replace(/^\s*(?:long\s*description|description|summary)\s*[:\-]+\s*/i, "")
            .replace(/^\s*(?:sure|certainly|of course|okay|ok)\b[,!.:]?\s*/i, "")
            .replace(/^\s*here(?:'s| is)\b[^:\n]{0,80}:\s*/i, "")
            .replace(/^[\s"'`]+|[\s"'`]+$/g, "")
            .replace(/[=]{3,}|[-]{3,}/g, " ")
            .replace(/[*_#`]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function cleanProse(text) {
        const cleaned = stripArtifacts(text);
        const lastSentenceEnd = cleaned.lastIndexOf(".");

        if (lastSentenceEnd > 150 && lastSentenceEnd < cleaned.length - 1) {
            return cleaned.slice(0, lastSentenceEnd + 1);
        }

        return cleaned;
    }

    // ---- generation --------------------------------------------------------

    function eligible(keys) {
        return keys.filter((key) =>
            schemaFor(key) && isFieldEmpty(key) && !window.AIReviewPanel.has(key) && !attempted.has(key));
    }

    async function generateProse(onToken) {
        const keys = eligible(AI_FIELDS.prose);
        if (!keys.length) {
            return;
        }

        const messages = baseMessages().concat({ role: "user", content: PROSE_TASK });
        const text = await window.AIEngine.completeStreamingText(
            messages,
            { temperature: 0.5, maxTokens: window.AIEngine.MODEL.proseMaxTokens },
            (accumulated) => onToken(accumulated)
        );

        keys.forEach((key) => attempted.add(key));

        if (text !== null) {
            window.AIReviewPanel.record("longDescription", cleanProse(text));
        }
    }

    async function generateClassifications() {
        const keys = eligible(AI_FIELDS.classify);
        if (!keys.length) {
            return;
        }

        const responseSchema = subSchemaFor(keys, {});
        const task = `Classify this repository. Fields:\n${fieldGuidance(keys)}\n\n${EXTRA_GUIDANCE}`;

        const messages = baseMessages().concat({ role: "user", content: task });
        const result = await window.AIEngine.complete(messages, responseSchema, {
            temperature: 0.2,
            maxTokens: 400
        });

        keys.forEach((key) => attempted.add(key));

        for (const key of keys) {
            window.AIReviewPanel.record(key, result[key]);
        }
    }

    async function generateCategories() {
        const keys = eligible(AI_FIELDS.categories);
        if (!keys.length) {
            return;
        }

        const responseSchema = {
            type: "object",
            properties: {
                categories: {
                    type: "array",
                    items: { type: "string", enum: PUBLICCODE_CATEGORIES },
                    maxItems: 3
                }
            },
            required: ["categories"],
            additionalProperties: false
        };

        const task = "Choose up to three categories that best describe what this software does.";
        const messages = baseMessages().concat({ role: "user", content: task });
        const result = await window.AIEngine.complete(messages, responseSchema, {
            temperature: 0.2,
            maxTokens: 128
        });

        keys.forEach((key) => attempted.add(key));

        window.AIReviewPanel.record("categories", result.categories);
    }

    // ---- run ---------------------------------------------------------------

    function element(id) {
        return document.getElementById(id);
    }

    function show(id, visible) {
        element(id).style.display = visible ? "" : "none";
    }

    function formatSize(sizeMB) {
        return sizeMB >= 1000 ? `${(sizeMB / 1000).toFixed(1)} GB` : `${sizeMB} MB`;
    }

    function setStatus(text) {
        element("ai-progress-text").textContent = text;
    }

    function setProgress(fraction) {
        element("ai-progress").value = Math.round((fraction || 0) * 100);
    }

    function draftableFields() {
        const all = AI_FIELDS.prose.concat(AI_FIELDS.classify, AI_FIELDS.categories);
        return all.filter((key) => schemaFor(key) && isFieldEmpty(key));
    }

    function remainingModelFields() {
        return eligible(draftableFields()).length;
    }

    function updateRunButton() {
        const button = element("ai-run");

        if (!modelAvailable) {
            return;
        }

        if (busy) {
            button.disabled = true;
            return;
        }

        if (window.AIReviewPanel.isReviewing()) {
            button.disabled = true;
            button.textContent = window.AIReviewPanel.hasBeenApplied()
                ? "Discard the drafts below to draft again"
                : "Apply or discard the drafts below";
            return;
        }

        const draftable = (context && schema) ? draftableFields() : [];

        if (!draftable.length) {
            button.disabled = true;
            button.textContent = "Nothing left to draft";
            return;
        }

        const remaining = remainingModelFields();
        const count = remaining || draftable.length;
        const plural = count === 1 ? "field" : "fields";

        button.disabled = false;

        if (!remaining) {
            button.textContent = `Draft ${count} ${plural} again`;
            return;
        }

        button.textContent = window.AIEngine.isModelCached()
            ? `Draft ${count} ${plural}`
            : `Download model and draft ${count} ${plural} (~${formatSize(window.AIEngine.MODEL.sizeMB)})`;
    }

    function revealPanel() {
        const panel = element("ai-panel");

        panel.style.display = "";
        panel.classList.add("ai-reveal");
        show("ai-enhance", false);
        panel.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    async function onRepoContextReady(event) {
        try {
            if (!schema) {
                schema = await retrieveFile(`schemas/${currentPage()}/schema.json`);
            }

            context = await window.AIContext.gather(event.detail.repoInfo, event.detail);

            window.AIReviewPanel.reset();
            attempted.clear();

            window.AIReviewPanel.applyRules(window.determinations.suggest(context));

            if (modelAvailable && remainingModelFields()) {
                if (element("ai-panel").style.display === "none") {
                    show("ai-enhance", true);
                }
                updateRunButton();
            }
        } catch (error) {
            console.error("AI context gathering failed:", error);
        }
    }

    function describeError(error) {
        const message = String((error && error.message) || error);

        if (/out of memory|device lost|OOM|createBuffer/i.test(message)) {
            return "Your GPU ran out of memory. Try the Llama 3.2 1B model, or close other tabs.";
        }
        if (/QuotaExceeded/i.test(message)) {
            return "Your browser ran out of storage for the model. Free up disk space, and note " +
                "that private/incognito windows cannot cache it.";
        }
        if (/huggingface|jsdelivr|esm\.run|raw\.githubusercontent|Failed to fetch|NetworkError/i.test(message)) {
            return "Could not download the model. This needs access to huggingface.co, " +
                "raw.githubusercontent.com and cdn.jsdelivr.net - if you are on a managed " +
                "network, those hosts may need to be allowed.";
        }

        return `In-browser AI failed: ${message}`;
    }

    async function runStep(label, failed, work) {
        try {
            await work();
        } catch (error) {
            if (window.AIEngine.isCancelled() || (error && error.name === "AbortError")) {
                throw error;
            }
            console.error(`AI step failed (${label}):`, error);
            failed.push(label);
        }
    }

    function confirmDownload() {
        if (window.AIEngine.isModelCached()) {
            return true;
        }

        return window.confirm(
            `This downloads the ${formatSize(window.AIEngine.MODEL.sizeMB)} AI model and runs it in this ` +
            "tab. It's cached afterward so this only happens once. Continue?"
        );
    }

    async function run() {
        if (!remainingModelFields()) {
            attempted.clear();
        }

        if (!(await window.AIEngine.hasRoomFor())) {
            window.showErrorNotification(
                "Your browser has less storage available than this model needs. " +
                "Private/incognito windows cannot cache it - try a normal window."
            );
            return;
        }

        if (!confirmDownload()) {
            return;
        }

        busy = true;
        updateRunButton();
        show("ai-progress-wrap", true);
        show("ai-cancel", true);
        element("ai-stream").textContent = "";
        setProgress(0);
        setStatus("Preparing the model...");

        if (typeof gas4 === "function") {
            gas4("ai_generation_started", {
                form_name: "code.json form",
                form_id: "formio",
                form_destination: window.location.pathname,
                ai_model: window.AIEngine.MODEL.id
            });
        }

        try {
            await window.AIEngine.load((report) => {
                setProgress(report.progress);
                setStatus(report.text || "");
            });

            if (window.AIEngine.isCancelled()) {
                return;
            }

            setProgress(1);

            const failed = [];

            await runStep("the long description", failed, () =>
                generateProse((partial) => {
                    setStatus("Writing the long description (1 of 3)...");
                    element("ai-stream").textContent = stripArtifacts(partial).slice(-800);
                }));

            setStatus("Classifying fields (2 of 3)...");
            await runStep("the classification fields", failed, generateClassifications);

            setStatus("Choosing categories (3 of 3)...");
            await runStep("the categories", failed, generateCategories);

            if (window.AIEngine.isCancelled()) {
                return;
            }

            window.AIReviewPanel.render();

            const drafted = window.AIReviewPanel.count();

            if (failed.length && drafted) {
                window.showErrorNotification(
                    `Drafted ${drafted} field(s), but could not finish ${failed.join(" or ")}.`
                );
            } else if (failed.length) {
                window.showErrorNotification(`The model could not finish ${failed.join(" or ")}.`);
            }
        } catch (error) {
            if (error && error.name === "AbortError") {
                setStatus("Cancelled.");
            } else {
                console.error("AI generation failed:", error);
                window.showErrorNotification(describeError(error));
            }
        } finally {
            busy = false;
            show("ai-cancel", false);
            show("ai-progress-wrap", false);
            updateRunButton();
        }
    }

    async function init() {
        document.addEventListener("repo-context-ready", onRepoContextReady);

        const applyButton = element("ai-apply");
        applyButton.dataset.label = applyButton.textContent.trim();

        const support = await window.AIEngine.isSupported();

        if (!support.ok) {
            console.info("In-browser AI unavailable:", support.reason);
            return;
        }

        modelAvailable = true;

        element("ai-enhance").addEventListener("click", revealPanel);
        
        applyButton.addEventListener("click", () => {
            window.AIReviewPanel.apply();
            updateRunButton();
        });

        element("ai-discard").addEventListener("click", () => {
            window.AIReviewPanel.reset();
            updateRunButton();
        });

        element("ai-run").addEventListener("click", run);

        element("ai-cancel").addEventListener("click", () => {
            window.AIEngine.cancel();
            setStatus("Cancelling...");
        });

        element("ai-clear-cache").addEventListener("click", async (event) => {
            if (!window.AIEngine.isModelCached()) {
                return;
            }

            if (!window.confirm(
                "This deletes the cached AI model. You'll need to download it again " +
                "next time you draft fields. Continue?"
            )) {
                return;
            }

            await window.AIEngine.clearCache();
            updateRunButton();
        });

        updateRunButton();
    }

    document.addEventListener("DOMContentLoaded", init);

    window.AIOrchestrator = {
        AI_FIELDS,
        NEVER_TOUCH,
        PUBLICCODE_CATEGORIES,
        schemaFor,
        subSchemaFor,
        validateValue,
        toWidgetValue,
        isFieldEmpty,
        setSchemaValue,
        cleanProse,
        stripArtifacts,
        run
    };
})();
