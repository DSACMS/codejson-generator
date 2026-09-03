// rule based field suggestions derived from repository metadata and the root file listing                          
(function () {
    function fileSet(rootFiles) {
        return new Set((rootFiles || []).map((file) => file.name.toLowerCase()));
    }

    function hasAny(names, candidates) {
        return candidates.some((candidate) => names.has(candidate));
    }

    function maturityTier(rootFiles) {
        const names = fileSet(rootFiles);

        const hasReadme = hasAny(names, ["readme.md", "readme", "readme.rst", "readme.txt"]);
        if (!hasReadme) {
            return 0;
        }

        const hasLicense = [...names].some((name) => name.startsWith("license") || name.startsWith("licence"));
        if (!hasLicense) {
            return 1;
        }

        const hasContributing = hasAny(names, ["contributing.md", "contributing"]);
        const hasConduct = hasAny(names, ["code_of_conduct.md", "code-of-conduct.md"]);
        if (!hasContributing || !hasConduct) {
            return 2;
        }

        const hasSecurity = hasAny(names, ["security.md"]);
        const hasStewardship = hasAny(names, ["maintainers.md", "governance.md", "codeowners.md"]);
        const hasAutomation = names.has(".github");
        if (!hasSecurity || !hasStewardship || !hasAutomation) {
            return 3;
        }

        return 4;
    }

    function majorVersion(tagName) {
        const match = String(tagName || "").match(/(\d+)\./);
        return match ? Number(match[1]) : null;
    }

    function monthsSince(dateString) {
        if (!dateString) {
            return Infinity;
        }
        const elapsed = Date.now() - new Date(dateString).getTime();
        return elapsed / (1000 * 60 * 60 * 24 * 30);
    }

    function developmentStatus(repoData, release) {
        if (repoData.archived) {
            return "Archival";
        }

        const major = release ? majorVersion(release.tag_name) : null;
        if (major !== null && major >= 1) {
            return "Production";
        }
        if (major !== null) {
            return "Beta";
        }

        const idleMonths = monthsSince(repoData.pushed_at);
        if (idleMonths > 12) {
            return "Ideation";
        }

        return "Development";
    }

    const IOS_LANGUAGES = ["Swift", "Objective-C"];
    const DESKTOP_MARKERS = ["electron-builder.yml", "tauri.conf.json"];

    function platforms(context) {
        const names = fileSet(context.rootFiles);
        const languages = Object.keys(context.languages || {});
        const selected = new Set();

        const webMarkers = ["package.json", "index.html", "public", "src", "gemfile"];
        if (hasAny(names, webMarkers) || context.repoData.has_pages) {
            selected.add("web");
        }

        if (languages.some((language) => IOS_LANGUAGES.includes(language))) {
            selected.add("ios");
        }
        if (languages.includes("Kotlin") || languages.includes("Java")) {
            if (hasAny(names, ["build.gradle", "build.gradle.kts", "settings.gradle"])) {
                selected.add("android");
            }
        }
        if (hasAny(names, ["dockerfile", "docker-compose.yml", "makefile"])) {
            selected.add("linux");
        }
        if (hasAny(names, DESKTOP_MARKERS)) {
            selected.add("mac");
            selected.add("windows");
        }

        return [...selected];
    }

    function softwareType(context) {
        const names = fileSet(context.rootFiles);

        if ([...names].some((name) => name.endsWith(".tf")) || names.has("terraform")) {
            return "configurationFiles";
        }
        if (hasAny(names, ["action.yml", "action.yaml"])) {
            return "addon";
        }
        if (hasAny(names, ["index.html", "public"]) || context.repoData.has_pages) {
            return "standalone/web";
        }
        if (hasAny(names, ["dockerfile", "docker-compose.yml"])) {
            return "standalone/backend";
        }
        if (hasAny(names, ["setup.py", "pyproject.toml", "gemspec", "go.mod"])) {
            return "library";
        }

        return null;
    }

    function repositoryType(context) {
        const names = fileSet(context.rootFiles);

        if (hasAny(names, ["action.yml", "action.yaml"])) {
            return "tools";
        }
        if (context.repoData.has_pages || hasAny(names, ["index.html", "_config.yml"])) {
            return "website";
        }
        if (hasAny(names, ["openapi.yaml", "openapi.json", "swagger.yaml"])) {
            return "APIs";
        }
        if (hasAny(names, ["setup.py", "pyproject.toml", "go.mod"])) {
            return "libraries";
        }

        return null;
    }

    function contactEmail(readme) {
        const matches = String(readme || "").match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g);
        if (!matches || !matches.length) {
            return null;
        }

        const unique = [...new Set(matches.map((address) => address.toLowerCase()))]
            .filter((address) => !address.endsWith(".png") && !address.endsWith(".svg"));

        if (!unique.length) {
            return null;
        }

        return unique.find((address) => address.includes(".gov")) || unique[0];
    }

    function add(suggestions, field, value, why) {
        const isEmptyArray = Array.isArray(value) && !value.length;

        if (value === null || value === undefined || value === "" || isEmptyArray) {
            return;
        }

        suggestions[field] = { value, source: "rule", why };
    }

    function suggest(context) {
        const suggestions = {};
        const repo = context.repoData;
        const release = context.latestRelease;

        add(suggestions, "status", developmentStatus(repo, release),
            repo.archived ? "repository is archived" : "inferred from releases and recent activity");

        add(suggestions, "maturityModelTier", maturityTier(context.rootFiles),
            "based on the community health files present in the repository root");

        if (release && release.tag_name) {
            add(suggestions, "version", String(release.tag_name).replace(/^v/i, ""),
                `latest release tag ${release.tag_name}`);
        }

        if (repo.homepage && /^https?:\/\//i.test(repo.homepage)) {
            add(suggestions, "homepageURL", repo.homepage, "homepage set on the GitHub repository");
        }

        add(suggestions, "platforms", platforms(context), "inferred from languages and root files");
        add(suggestions, "softwareType", softwareType(context), "inferred from root files");
        add(suggestions, "repositoryType", repositoryType(context), "inferred from root files");
        add(suggestions, "contact.email", contactEmail(context.readme), "email address found in the README");

        return suggestions;
    }

    window.determinations = {
        suggest,
        maturityTier,
        developmentStatus,
        platforms,
        softwareType,
        repositoryType,
        contactEmail
    };
})();
