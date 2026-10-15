# codejson-generator

Form to generate an agency code.json

https://dsacms.github.io/codejson-generator/

## About the Project

A web form where project teams fill out information about their project and creates a completed code.json for local download to add to repositories. [Form.io](https://github.com/formio/uswds) is used for form generation. The form supports multiple agency-specific schemas and optional AI-assisted field drafting, see [Features](#features) below.

https://dsacms.github.io/codejson-generator/

To produce the form, a JSON schema is ingested where it transforms each field to a Form.io component. At the moment, this is used for code.json, however this works for any JSON schema!

<!---
### Project Vision
**{project vision}** -->

<!--
### Project Mission
**{project mission}** -->

<!--
### Agency Mission
TODO: Good to include since this is an agency-led project -->

<!--
### Team Mission
TODO: Good to include since this is an agency-led project -->

## Features

### Agency-specific schemas

The form can generate a code.json against more than one JSON schema. The schema used is selected with a `page` query parameter on the site URL:

- `https://dsacms.github.io/codejson-generator/` (no parameter) loads the default, agency-agnostic schema at `schemas/gov/schema.json`
- `https://dsacms.github.io/codejson-generator/?page=cms` loads a stricter, CMS-specific schema at `schemas/cms/schema.json`

Currently, those are the only two schemas available. Under the hood, `?page=<name>` loads `schemas/<name>/schema.json`, and the project is built so that a maintainer can add a new schema for another agency by creating `schemas/<name>/schema.json`.

### AI-assisted field drafting (WebLLM)

Once a repository URL is submitted and the GitHub metadata has been pulled in, the form can optionally draft the fields that can't be reliably filled in from repository metadata alone (for example, `longDescription`, and a handful of classification fields like `status`, `softwareType`, or `maturityModelTier`).

This works in two layers:

1. **Rule based suggestions** (`js/ai/determinations.js`) run automatically and don't require any AI model. These infer values like development status, maturity tier, or platforms directly from things that are already present in the repository (release tags, root file listing, languages, etc.).

1. **In-browser AI suggestions** (`js/ai/aiEngine.js`, `js/ai/aiOrchestrator.js`, `js/ai/aiContext.js`, `js/ai/aiReviewPanel.js`, `js/ai/webLLMWorker.js`) fill in any fields that are still empty after the rule-based pass. This uses WebLLM to run a small local model (Llama-3.2-1B-Instruct, ~880 MB) directly in the browser via WebGPU.

Key things to know about this feature:

- **Runs entirely client-side.** The model is downloaded once, cached in the browser, and run locally. No form data or repository content is sent to any external server, only the existing GitHub API calls used elsewhere in the form.

- **Requires WebGPU.** If the browser doesn't support WebGPU (or no GPU adapter is available), the "Enhance with AI" option simply doesn't appear. This is a fallback, not an error state.
- **Never overwrites existing or user-entered data.** The orchestrator only attempts to draft fields that are still empty, and some fields (URLs, labor hours, names, permissions, etc.) are explicitly excluded from AI suggestion entirely (see `NEVER_TOUCH` in `js/ai/aiOrchestrator.js`).
- **Always goes through human review.** Drafted values are shown in a review panel where they can be edited or unchecked before anything is written into the form. Nothing is applied automatically.
- **Caching.** The downloaded model is cached in the browser so it only needs to be fetched once; there's a "Clear cached model files" control if a user wants to remove it.

## GitHub API Key field

The form includes an optional "GitHub API Key" field. This is unrelated to the AI feature itself. It exists because the form makes several unauthenticated calls to the GitHub REST API (to fetch repo metadata, languages, root files, README contents, and latest release) while pre-filling fields and gathering context for AI drafting. Unauthenticated GitHub API requests are capped at 60 requests/hour per IP address; providing a personal access token raises that limit to 5,000/hour. The token is only used client-side for these GitHub API calls, and, if used, for creating a branch/PR back to the repository.

## Core Team

An up-to-date list of core team members can be found in [MAINTAINERS.md](MAINTAINERS.md). At this time, the project is still building the core team and defining roles and responsibilities. We are eagerly seeking individuals who would like to join the community and help us define and fill these roles.

## Documentation Index

##### Schemas

- [code.json schema](./schemas/schema-0.0.0.json)

##### Files

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [MAINTAINERS.md](./MAINTAINERS.md)
- [CODEOWNERS.md](./CODEOWNERS.md)
- [COMMUNITY_GUIDELINES.md](./COMMUNITY_GUIDELINES.md)
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- [SECURITY.md](./SECURITY.md)
- [LICENSE](./LICENSE)

## Repository Structure

<!-- TODO: Using the "tree -d" command can be a helpful way to generate this information, but, be sure to update it as the project evolves and changes over time.-->

```
.
├── css
├── js
│   └── ai
└── schemas
```

# Development and Software Delivery Lifecycle

The following guide is for members of the project team who have access to the repository as well as code contributors. The main difference between internal and external contributions is that external contributors will need to fork the project and will not be able to merge their own pull requests. For more information on contributing, see: [CONTRIBUTING.md](./CONTRIBUTING.md).

## Local Development

To run the project locally,

1. Start up a HTTP server using python: `python3 -m http.server 8000`
2. Upon launch, here is the form! Right click to inspect to open developer tools for troubleshooting
3. Fill out form
4. Click submit, which triggers a local download of the completed code.json

This form works with any JSON schema. To ingest a JSON schema:

1. Add JSON schema to `schemas/`
2. Update value of filePath variable in line 60 of `js/generateFormComponents.js`

To test the AI field-drafting feature locally, you'll need a browser with WebGPU support (recent Chrome/Edge). The first run downloads the model (~880 MB), so keep the tab open until it finishes.

## Coding Style and Linters

Prettier is used for HTML/CSS and Javascript formatting. Lint and code tests are run on each commit, so linters and tests should be run locally before committing.

## Branching Model

- Make small changes in [short-lived feature branches](https://trunkbaseddevelopment.com/short-lived-feature-branches/) and merge to `main` frequently.
- Be open to submitting multiple small pull requests for a single ticket (i.e. reference the same ticket across multiple pull requests).
- Treat each change you merge to `main` as immediately deployable to production. Do not merge changes that depend on subsequent changes you plan to make, even if you plan to make those changes shortly.
- Ticket any unfinished or partially finished work.
- Tests should be written for changes introduced, and adhere to the text percentage threshold determined by the project.

This project uses **continuous deployment** using [Github Actions](https://github.com/features/actions) which is configured in the [./github/workflows](.github/workflows) directory.

Pull-requests are merged to `main` and the changes are immediately deployed to the development environment. Releases are created to push changes to production.

## Contributing

Thank you for considering contributing to an Open Source project of the US Government! For more information about our contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Codeowners

The contents of this repository are managed by CMS Open Source Program Office. Those responsible for the code and documentation in this repository can be found in [CODEOWNERS.md](CODEOWNERS.md).

## Community

The codejson-generator team is taking a community-first and open source approach to the product development of this tool. We believe government software should be made in the open and be built and licensed such that anyone can download the code, run it themselves without paying money to third parties or using proprietary software, and use it as they will.

We know that we can learn from a wide variety of communities, including those who will use or will be impacted by the tool, who are experts in technology, or who have experience with similar technologies deployed in other spaces. We are dedicated to creating forums for continuous conversation and feedback to help shape the design and development of the tool.

We also recognize capacity building as a key part of involving a diverse open source community. We are doing our best to use accessible language, provide technical and process documents, and offer support to community members with a wide variety of backgrounds and skillsets.

### Community Guidelines

Principles and guidelines for participating in our open source community are can be found in [COMMUNITY_GUIDELINES.md](COMMUNITY_GUIDELINES.md). Please read them before joining or starting a conversation in this repo or one of the channels listed below. All community members and participants are expected to adhere to the community guidelines and code of conduct when participating in community spaces including: code repositories, communication channels and venues, and events.

<!--
## Governance
Information about how the codejson-generator community is governed may be found in [GOVERNANCE.md](GOVERNANCE.md).
-->

## Feedback

If you have ideas for how we can improve or add to our capacity building efforts and methods for welcoming people into our community, please let us know at opensource@cms.hhs.gov. If you would like to comment on the tool itself, please let us know by filing an **issue on our GitHub repository.**

<!--
## Glossary
Information about terminology and acronyms used in this documentation may be found in [GLOSSARY.md](GLOSSARY.md).
-->

## Policies

### Open Source Policy

We adhere to the [CMS Open Source
Policy](https://github.com/CMSGov/cms-open-source-policy). If you have any
questions, just [shoot us an email](mailto:opensource@cms.hhs.gov).

### Security and Responsible Disclosure Policy

_Submit a vulnerability:_ Vulnerability reports can be submitted through [Bugcrowd](https://bugcrowd.com/cms-vdp). Reports may be submitted anonymously. If you share contact information, we will acknowledge receipt of your report within 3 business days.

For more information about our Security, Vulnerability, and Responsible Disclosure Policies, see [SECURITY.md](SECURITY.md).

### Software Bill of Materials (SBOM)

A Software Bill of Materials (SBOM) is a formal record containing the details and supply chain relationships of various components used in building software.

In the spirit of [Executive Order 14028 - Improving the Nation’s Cyber Security](https://www.gsa.gov/technology/it-contract-vehicles-and-purchasing-programs/information-technology-category/it-security/executive-order-14028), a SBOM for this repository is provided here: https://github.com/DSACMS/codejson-generator/network/dependencies.

For more information and resources about SBOMs, visit: https://www.cisa.gov/sbom.

## Public domain

This project is in the public domain within the United States, and copyright and related rights in the work worldwide are waived through the [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/) as indicated in [LICENSE](LICENSE).

All contributions to this project will be released under the CC0 dedication. By submitting a pull request or issue, you are agreeing to comply with this waiver of copyright interest.
