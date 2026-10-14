# How to Contribute

<!-- Basic instructions about where to send patches, check out source code, and get development support.-->

We're so thankful you're considering contributing to an [open source project of
the U.S. government](https://code.gov/)! If you're unsure about anything, just
ask -- or submit the issue or pull request anyway. The worst that can happen is
you'll be politely asked to change something. We appreciate all friendly
contributions.

We encourage you to read this project's CONTRIBUTING policy (you are here), its
[LICENSE](LICENSE.md), and its [README](README.md).

## Getting Started

To run the project locally,

1. Start up a HTTP server using python: `python3 -m http.server 8000`
2. Upon launch, here is the form! Right click to inspect to open developer tools for troubleshooting
3. Fill out form
4. Click submit, which triggers a local download of the completed code.json

### Team Specific Guidelines

- Please try to keep pull requests to a reasonable size; try to split large contributions to multiple PRs
- Please create pull requests into dev unless the contribution is some kind of bugfix or urgent hotfix
- Document and explain the contribution clearly according to provided standards when possible
- Feel free to reach out to us if there is any confusion. A list of the project maintainers is found here: [COMMUNITY.md](./COMMUNITY.md)

### Building dependencies

Python is required in order to run this project locally.

### Building the Project

1. Start up a HTTP server using python: `python3 -m http.server 8000`

### Workflow and Branching

We follow the [GitHub Flow Workflow](https://guides.github.com/introduction/flow/)

1.  Fork the project
2.  Check out the `dev` branch
3.  Create a feature branch
4.  Write code and tests for your change
5.  From your branch, make a pull request against `DSACMS/codejson-generator/dev`
6.  Work with repo maintainers to get your change reviewed
7.  Wait for your change to be pulled into `DSACMS/codejson-generator/main`
8.  Delete your feature branch

### Testing Conventions

<!--- TODO: Discuss where tests can be found, how they are run, and what kind of tests/coverage strategy and goals the project has. -->

We are working on tests at the moment. Stay tuned.

### Coding Style and Linters

<!--- TODO: HIGHLY ENCOURAGED. Specific tools will vary between different languages/frameworks (e.g. Black for python, eslint for JavaScript, etc...)

1. Mention any style guides you adhere to (e.g. pep8, etc...)
2. Mention any linters your project uses (e.g. flake8, jslint, etc...)
3. Mention any naming conventions your project uses (e.g. Semantic Versioning, CamelCasing, etc...)
4. Mention any other content guidelines the project adheres to (e.g. plainlanguage.gov, etc...)

-->

Prettier is used for HTML/CSS and Javascript formatting. Stay tuned for the prettier config file.

### Writing Issues

When creating an issue please try to adhere to the following format:

    module-name: One line summary of the issue (less than 72 characters)

    ### Expected behavior

    As concisely as possible, describe the expected behavior.

    ### Actual behavior

    As concisely as possible, describe the observed behavior.

    ### Steps to reproduce the behavior

    List all relevant steps to reproduce the observed behavior.

    see our .github/ISSUE_TEMPLATE.md for more examples.

### Writing Pull Requests

Comments should be formatted to a width no greater than 80 columns.

Files should be exempt of trailing spaces.

We adhere to a specific format for commit messages. Please write your commit
messages along these guidelines. Please keep the line width no greater than 80
columns (You can use `fmt -n -p -w 80` to accomplish this).

    module-name: One line description of your change (less than 72 characters)

    Problem

    Explain the context and why you're making that change.  What is the problem
    you're trying to solve? In some cases there is not a problem and this can be
    thought of being the motivation for your change.

    Solution

    Describe the modifications you've done.

    Result

    What will change as a result of your pull request? Note that sometimes this
    section is unnecessary because it is self-explanatory based on the solution.

Some important notes regarding the summary line:

- Describe what was done; not the result
- Use the active voice
- Use the present tense
- Capitalize properly
- Do not end in a period — this is a title/subject
- Prefix the subject with its scope

  see our .github/PULL_REQUEST_TEMPLATE.md for more examples.

## Reviewing Pull Requests

When you submit a pull request on GitHub, it will be reviewed by the project
community, and once the changes are approved, your commits will be brought into the main branch that deploys the production website.

<!--
## Shipping Releases

<!-- TODO: What cadence does your project ship new releases? (e.g. one-time, ad-hoc, periodically, upon merge of new patches) Who does so?
-->

## Documentation

At the moment, we are working on documentation for the CMS code.json schema. Stay tuned.

We also welcome improvements to the project documentation or to the existing
docs. Please file an [issue](https://github.com/DSACMS/codejson-generator/issues).

## Policies

### Open Source Policy

We adhere to the [CMS Open Source
Policy](https://github.com/CMSGov/cms-open-source-policy). If you have any
questions, just [shoot us an email](mailto:opensource@cms.hhs.gov).

### Security and Responsible Disclosure Policy

_Submit a vulnerability:_ Vulnerability reports can be submitted through [Bugcrowd](https://bugcrowd.com/cms-vdp). Reports may be submitted anonymously. If you share contact information, we will acknowledge receipt of your report within 3 business days.

For more information about our Security, Vulnerability, and Responsible Disclosure Policies, see [SECURITY.md](SECURITY.md).

## Public domain

This project is in the public domain within the United States, and copyright and related rights in the work worldwide are waived through the [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/).

All contributions to this project will be released under the CC0 dedication. By submitting a pull request or issue, you are agreeing to comply with this waiver of copyright interest.
