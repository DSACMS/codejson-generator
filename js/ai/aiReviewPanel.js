// renders AI suggestions for review and writes accepted values into the form
(function () {
    const suggestions = {};
    let reviewing = false;
    let hasApplied = false;

    function element(id) {
        return document.getElementById(id);
    }

    function show(id, visible) {
        element(id).style.display = visible ? "" : "none";
    }

    function escapeHTML(text) {
        return String(text).replace(/[&<>"]/g, (character) => (
            { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character]
        ));
    }

    const BUTTON_FLASH_MS = 1200;

    function flashButton(label) {
        const button = element("ai-apply");

        button.textContent = label;
        button.setAttribute("aria-disabled", "true");

        setTimeout(() => {
            button.textContent = button.dataset.label;
            button.removeAttribute("aria-disabled");
        }, BUTTON_FLASH_MS);
    }

    function lockReviewPanel(count) {
        const button = element("ai-apply");
        const plural = count === 1 ? "field" : "fields";

        button.textContent = `✓ Applied ${count} ${plural}`;
        button.setAttribute("aria-disabled", "true");
        button.classList.add("ai-button--applied");

        element("ai-review-list").disabled = true;
    }

    function reset() {
        const button = element("ai-apply");

        button.textContent = button.dataset.label;
        button.removeAttribute("aria-disabled");
        button.classList.remove("ai-button--applied");
        element("ai-review-list").disabled = false;

        for (const key of Object.keys(suggestions)) {
            delete suggestions[key];
        }
        reviewing = false;
        hasApplied = false;
        show("ai-review", false);
    }

    function editorFor(key, field, value) {
        const identifier = `ai-f-${key.replace(/\./g, "-")}`;

        switch (determineType(field)) {
            case "selectboxes":
                return `<div class="ai-options" data-field="${key}">` + field.items.enum
                    .map((option, index) => `
                        <div class="usa-checkbox ai-option">
                            <input class="usa-checkbox__input" type="checkbox"
                                id="${identifier}-o${index}" data-option="${escapeHTML(option)}"
                                ${value.indexOf(option) === -1 ? "" : "checked"}>
                            <label class="usa-checkbox__label"
                                for="${identifier}-o${index}">${escapeHTML(option)}</label>
                        </div>`)
                    .join("") + "</div>";

            case "select-boolean":
                return `<select class="usa-select ai-edit" data-field="${key}">` +
                    [true, false].map((option) =>
                        `<option value="${option}"${option === value ? " selected" : ""}>${option}</option>`)
                    .join("") + "</select>";

            case "radio":
                return `<select class="usa-select ai-edit" data-field="${key}">` +
                    field.enum.map((option) => {
                        const text = escapeHTML(String(option));
                        const selected = String(option) === String(value) ? " selected" : "";
                        return `<option value="${text}"${selected}>${text}</option>`;
                    }).join("") + "</select>";

            case "tags":
                return `<input class="usa-input ai-edit" data-field="${key}" ` +
                    `value="${escapeHTML(value.join(", "))}">`;

            case "number":
            case "integer":
                return `<input class="usa-input ai-edit" type="number" data-field="${key}" ` +
                    `value="${escapeHTML(String(value))}">`;

            default:
                return `<textarea class="usa-textarea ai-edit" data-field="${key}" ` +
                    `rows="5">${escapeHTML(value)}</textarea>`;
        }
    }

    function readRowValue(key, field) {
        if (determineType(field) === "selectboxes") {
            const container = document.querySelector(`.ai-options[data-field="${key}"]`);
            return [...container.querySelectorAll("input:checked")]
                .map((input) => input.dataset.option);
        }

        const editor = document.querySelector(`.ai-edit[data-field="${key}"]`);
        if (!editor) {
            return suggestions[key].value;
        }

        if (determineType(field) === "tags") {
            return editor.value.split(",").map((entry) => entry.trim()).filter(Boolean);
        }

        return editor.value;
    }

    function suggestionRow(key, suggestion) {
        const field = window.AIOrchestrator.schemaFor(key);
        const identifier = `ai-f-${key.replace(/\./g, "-")}`;

        const warning = suggestion.warn
            ? `<span class="ai-warn">${escapeHTML(suggestion.warn)}</span>`
            : "";
        const dropped = suggestion.dropped && suggestion.dropped.length
            ? `<div class="ai-note">Dropped: ${escapeHTML(suggestion.dropped.join(", "))} (not valid options)</div>`
            : "";
        const control = editorFor(key, field, suggestion.value);

        return `
            <div class="usa-checkbox ai-row">
                <input class="usa-checkbox__input ai-row-select" type="checkbox"
                    id="${identifier}" data-field="${key}" checked>
                <label class="usa-checkbox__label" for="${identifier}">
                    ${escapeHTML(key)}
                    ${warning}
                    <span class="usa-checkbox__label-description">${escapeHTML(field.description || "")}</span>
                </label>
                ${control}
                ${dropped}
            </div>`;
    }

    function render() {
        const keys = Object.keys(suggestions);

        if (!keys.length) {
            reviewing = false;
            show("ai-review", false);
            return;
        }

        reviewing = true;

        element("ai-review-list").innerHTML = keys
            .map((key) => suggestionRow(key, suggestions[key]))
            .join("");

        show("ai-review", true);
    }

    function writeField(key, rawValue) {
        if (window.AIOrchestrator.NEVER_TOUCH.has(key.split(".")[0])) {
            return false;
        }

        const field = window.AIOrchestrator.schemaFor(key);
        if (!field) {
            return false;
        }

        const validated = window.AIOrchestrator.validateValue(field, rawValue);
        if (!validated.ok) {
            console.warn(`Skipped ${key}: ${validated.why}`);
            return false;
        }

        try {
            window.AIOrchestrator.setSchemaValue(key, window.AIOrchestrator.toWidgetValue(field, validated.value));
            return true;
        } catch (error) {
            console.error("Could not set", key, error);
            return false;
        }
    }

    function applyRules(rules) {
        let applied = 0;

        for (const key of Object.keys(rules)) {
            if (!window.AIOrchestrator.schemaFor(key) || !window.AIOrchestrator.isFieldEmpty(key)) {
                continue;
            }
            if (writeField(key, rules[key].value)) {
                applied++;
            }
        }

        return applied;
    }

    function apply() {
        const form = window.formIOInstance;

        if (element("ai-apply").getAttribute("aria-disabled") === "true") {
            return;
        }

        if (!form) {
            window.showErrorNotification("Form interface not initialized. Please refresh and try again.");
            return;
        }

        let applied = 0;
        const failed = [];
        const written = [];
        const checked = document.querySelectorAll("#ai-review-list .ai-row-select:checked");

        checked.forEach((checkbox) => {
            const key = checkbox.dataset.field;

            try {
                const raw = readRowValue(key, window.AIOrchestrator.schemaFor(key));

                if (Array.isArray(raw) && !raw.length) {
                    return;
                }

                if (writeField(key, raw)) {
                    applied++;
                    written.push(key);
                } else {
                    failed.push(key);
                }
            } catch (error) {
                console.error("Could not read the review row for", key, error);
                failed.push(key || "an unnamed row");
            }
        });

        if (typeof gas4 === "function") {
            gas4("ai_suggestions_applied", {
                form_name: "code.json form",
                form_id: "formio",
                form_destination: window.location.pathname,
                fields_applied: applied
            });
        }

        if (failed.length) {
            window.showErrorNotification(
                `Applied ${applied} field(s). Could not set: ${failed.join(", ")}.`
            );
        }

        if (!applied) {
            flashButton("Nothing selected");
            return;
        }

        hasApplied = true;
        lockReviewPanel(applied);
    }

    function record(key, rawValue) {
        if (window.AIOrchestrator.NEVER_TOUCH.has(key.split(".")[0]) || suggestions[key]) {
            return;
        }

        const field = window.AIOrchestrator.schemaFor(key);
        if (!field || rawValue === null || rawValue === undefined) {
            return;
        }

        const validated = window.AIOrchestrator.validateValue(field, rawValue);
        if (!validated.ok) {
            console.warn(`Dropped AI suggestion for ${key}: ${validated.why}`);
            return;
        }

        suggestions[key] = {
            value: validated.value,
            warn: validated.warn,
            dropped: validated.dropped
        };
    }

    function has(key) {
        return Boolean(suggestions[key]);
    }

    function count() {
        return Object.keys(suggestions).length;
    }

    function isReviewing() {
        return reviewing;
    }

    function hasBeenApplied() {
        return hasApplied;
    }

    window.AIReviewPanel = {
        record,
        has,
        count,
        isReviewing,
        hasBeenApplied,
        applyRules,
        render,
        reset,
        apply,
        editorFor,
        suggestionRow
    };
})();
