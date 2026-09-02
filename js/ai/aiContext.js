// gathers everything the AI suggestions need to know about a repository.
(function () {
    const contextCache = new Map();

    function getGitHubToken() {
        try {
            const value = window.formIOInstance.getComponent("gh_api_key").getValue();
            if (value && String(value).trim()) {
                return String(value).trim();
            }
        } catch (error) {}
        return window.gh_api_key || null;
    }

    function ghHeaders(accept) {
        const headers = { "X-GitHub-Api-Version": "2022-11-28" };

        if (accept) {
            headers.Accept = accept;
        }

        const token = getGitHubToken();
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        return { headers };
    }

    function checkRateLimit(response) {
        const remaining = Number(response.headers.get("x-ratelimit-remaining"));

        if (!Number.isFinite(remaining) || remaining > 10 || getGitHubToken()) {
            return;
        }

        window.showErrorNotification(
            `GitHub API: ${remaining} requests left this hour. Add a GitHub API Key at ` +
            `the bottom of the form to raise the limit from 60 to 5,000.`
        );
    }

    async function getRootFiles(repoInfo) {
        const endpoint = `https://api.github.com/repos/${repoInfo.organization}/${repoInfo.repository}/contents`;

        try {
            const response = await fetch(endpoint, ghHeaders());
            if (!response.ok) {
                return [];
            }
            const files = await response.json();
            return Array.isArray(files) ? files : [];
        } catch (error) {
            console.error("Could not list repository root:", error.message);
            return [];
        }
    }

    async function getReadme(repoInfo) {
        const endpoint = `https://api.github.com/repos/${repoInfo.organization}/${repoInfo.repository}/readme`;

        try {
            const response = await fetch(endpoint, ghHeaders("application/vnd.github.raw"));

            // 404 just means the repository has no README
            if (!response.ok) {
                return "";
            }

            const contentType = response.headers.get("content-type") || "";
            if (!contentType.includes("json")) {
                return await response.text();
            }

            const payload = await response.json();
            const encoded = (payload.content || "").replace(/\s/g, "");
            const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
            return new TextDecoder("utf-8").decode(bytes);
        } catch (error) {
            console.error("Could not fetch README:", error.message);
            return "";
        }
    }

    async function getLatestRelease(repoInfo) {
        const endpoint = `https://api.github.com/repos/${repoInfo.organization}/${repoInfo.repository}/releases/latest`;

        try {
            const response = await fetch(endpoint, ghHeaders());
            // 404 is the common case
            return response.ok ? await response.json() : null;
        } catch (error) {
            console.error("Could not fetch latest release:", error.message);
            return null;
        }
    }

    const BOILERPLATE_HEADING = /^#{1,4}\s*(license|licence|code of conduct|contributing|security|contributors|acknowledge?ments?|table of contents|changelog|badges|citation)\b/i;

    function stripHtmlCommentsFully(input) {
        let previous;
        let current = input;
        do {
            previous = current;
            current = current.replace(/<!--[\s\S]*?-->/g, "");
        } while (current !== previous);
        return current;
    }

    function condenseReadme(markdown, maxChars) {
        if (!markdown) {
            return "";
        }

        let text = stripHtmlCommentsFully(markdown)
            .replace(/^(.+)\n={3,}\s*$/gm, "# $1")
            .replace(/^(.+)\n-{3,}\s*$/gm, "## $1")
            .replace(/^\s*\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)\s*$/gm, "")
            .replace(/!\[[^\]]*\]\(https?:\/\/(img\.shields\.io|badge)[^)]*\)/g, "")
            .replace(/```[\w-]*\n[\s\S]*?```/g, "[code example]")
            .replace(/^\s*\|.*\|\s*$/gm, "")
            .replace(/\n{3,}/g, "\n\n");

        const sections = text
            .split(/(?=^#{1,4}\s)/m)
            .filter((section) => !BOILERPLATE_HEADING.test(section));

        text = sections.join("").trim();

        if (text.length <= maxChars) {
            return text;
        }

        const head = Math.floor(maxChars * 0.7);
        const tail = maxChars - head - 20;
        return `${text.slice(0, head)}\n\n...\n\n${text.slice(-tail)}`;
    }

    function languagePercentages(languages) {
        if (!languages) {
            return "unknown";
        }

        const entries = Object.entries(languages);
        const total = entries.reduce((sum, entry) => sum + entry[1], 0);

        if (!total) {
            return "unknown";
        }

        return entries
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([name, bytes]) => `${name} ${Math.round((bytes / total) * 100)}%`)
            .join(", ");
    }

    function shortDate(value) {
        return value ? String(value).slice(0, 10) : "unknown";
    }

    function buildFactsBlock(context) {
        const repo = context.repoData;
        const release = context.latestRelease;
        const fileNames = context.rootFiles.map((file) => file.name);

        const lines = [
            `Repository: ${repo.full_name || repo.name}`,
            `Description: ${repo.description || "(none)"}`,
            `Topics: ${(repo.topics || []).join(", ") || "(none)"}`,
            `Languages by bytes: ${languagePercentages(context.languages)}`,
            `Homepage: ${repo.homepage || "(none)"}`,
            `Archived: ${repo.archived ? "yes" : "no"} | Fork: ${repo.fork ? "yes" : "no"} | ` +
                `GitHub Pages: ${repo.has_pages ? "yes" : "no"} | Open issues: ${repo.open_issues_count || 0}`,
            `Latest release: ${release ? `${release.tag_name} (${shortDate(release.published_at)})` : "(none)"}`,
            `Last push: ${shortDate(repo.pushed_at)} | Created: ${shortDate(repo.created_at)}`,
            `Root files: ${fileNames.join(", ") || "(none)"}`
        ];

        return lines.join("\n");
    }

    async function gather(repoInfo, prefetched) {
        const cacheKey = `${repoInfo.organization}/${repoInfo.repository}`;

        if (contextCache.has(cacheKey)) {
            return contextCache.get(cacheKey);
        }

        const rootFilesPromise = prefetched.rootFiles
            ? Promise.resolve(prefetched.rootFiles)
            : getRootFiles(repoInfo);

        const [rootFiles, readme, latestRelease] = await Promise.all([
            rootFilesPromise,
            getReadme(repoInfo),
            getLatestRelease(repoInfo)
        ]);

        const context = {
            repoInfo,
            repoData: prefetched.repoData,
            languages: prefetched.languages || {},
            rootFiles,
            readme,
            latestRelease
        };

        context.facts = buildFactsBlock(context);
        contextCache.set(cacheKey, context);

        return context;
    }

    window.AIContext = {
        gather,
        condenseReadme,
        buildFactsBlock,
        ghHeaders,
        getGitHubToken,
        checkRateLimit
    };
})();
