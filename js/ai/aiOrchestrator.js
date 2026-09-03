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
    let suggestions = {};
    let busy = false;
    let modelAvailable = false;
    let reviewing = false;
    let hasApplied = false;
    const attempted = new Set();

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

    window.AIOrchestrator = {
        AI_FIELDS,
        NEVER_TOUCH,
        PUBLICCODE_CATEGORIES,
        schemaFor,
        subSchemaFor
    };
})();
