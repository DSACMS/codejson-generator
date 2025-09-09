document.addEventListener("DOMContentLoaded", function () {
    setupFormHandler();
    setupNotificationSystem();
});

// This works by creating an object with methods for different notification types of either error or success
// Calling either of these methods calls the main functionality, show(), which manipulates the notification element in HTML
// The show() method changes the element based on type and displays the message to the user
// The hide() function makes sure that the notification fades away after 5 seconds
const notificationSystem = {
    show: function (message, type = 'error') {
        const notification = document.getElementById('notification');
        const notificationHeading = document.querySelector('.usa-alert__heading')
        const messageElement = document.querySelector('.usa-alert__text');

        messageElement.textContent = message;

        if (type === 'error') {
            notification.classList.add("usa-alert--error");
            notificationHeading.textContent = "Error";
        } else {
            notification.classList.add("usa-alert--success");
            notificationHeading.textContent = "Success";
        }

        notification.style.display = 'block';
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);

        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => this.hide(), 5000);
    },

    hide: function () {
        const notification = document.getElementById('notification');
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 500);
    },

    error: function (message) {
        this.show(message, 'error');
    },

    success: function (message) {
        this.show(message, 'success');
    },
};

function setupNotificationSystem() {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s ease';
    }
}

function setupFormHandler() {
    const form = document.getElementById("github-url-form");

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const submitButton = document.getElementById("repo-url-button");

        submitButton.value = "Loading...";
        submitButton.disabled = true;

        try {
            const repoURL = document.getElementById("repo-url").value;

            if (repoURL.length == 0) {
                throw new Error("Please enter a GitHub repository URL");
            }

            const repoInfo = extractGitHubInfo(repoURL);

            if (!repoInfo) {
                throw new Error("Invalid GitHub URL format. Please enter a valid GitHub repository URL ->(https://github.com/username/repository)");
            }

            const repositoryInfo = await getRepoInformation(repoInfo);
            const languages = await getRepoLanguages(repoInfo)

            if (repositoryInfo) {
                preFillFields(repositoryInfo, languages);
                notificationSystem.success("Repository data loaded successfully!");
            } else {
                throw new Error("Could not fetch repository information. Please check the URL and try again.");
            }

        } catch (error) {
            console.error(error.message);
            notificationSystem.error(error.message);
        } finally {
            submitButton.value = "Submit";
            submitButton.disabled = false;
        }
    });
}

function extractGitHubInfo(url) {
    // Regex pattern to match GitHub URLs and extract org and repo
    const regex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/\s]+)/;
    const match = url.match(regex);

    if (match && match.length === 3) {
        return {
            organization: match[1],
            repository: match[2]
        };
    }

    return null;
}

async function getRepoInformation(repoInfo) {
    const baseURL = "https://api.github.com/repos/";
    const endpoint = `${baseURL}${repoInfo.organization}/${repoInfo.repository}`;

    try {
        const response = await fetch(endpoint);

        if (!response.ok) {
            throw new Error(`GitHub API error (${response.status}): ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Fetch error:", error.message);
    }
}

async function getRepoLanguages(repoInfo) {
    const endpoint = `https://api.github.com/repos/${repoInfo.organization}/${repoInfo.repository}/languages`

    try {
        const response = await fetch(endpoint);

        if (!response.ok) {
            throw new Error(`GitHub API error (${response.status}): ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Fetch error:", error.message);
    }
}

async function getLicenseURL(repoURL) {
    const urlParts = repoURL.replace('https://github.com/', '').split('/')
    const owner = urlParts[0]
    const repo = urlParts[1]

    try {
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`
        const response = await fetch(apiUrl)

        const files = await response.json()

        const licenseFile = files.find(file => {
            const fileName = file.name.toLowerCase()
            return fileName.startsWith('license')
        })

        if (licenseFile) {
            return `${repoURL}/blob/main/${licenseFile.name}`
        }

        return `${repoURL}/blob/main/LICENSE`

    } catch (error) {
        console.error('Could not check license via API:', error.message)
        return `${repoURL}/blob/main/LICENSE`
    }
}

async function preFillFields(repoData, languages) {
    if (!window.formIOInstance) {
        notificationSystem.error("Form interface not initialized. Please refresh and try again.");
        return;
    }

    try {
        const form = window.formIOInstance

        // Updating VCS to git - typically always be git 
        form.getComponent('vcs').setValue('git')

        // Updating organization - only option available
        form.getComponent('organization').setValue('Centers for Medicare & Medicaid Services')

        // Updating visibility
        form.getComponent('repositoryVisibility').setValue(repoData.private ? 'private' : 'public')

        // Updating name
        if (repoData.name) {
            form.getComponent('name').setValue(repoData.name)
        }

        // Updating description
        if (repoData.description) {
            form.getComponent('description').setValue(repoData.description)
        }

        // Updating URL
        if (repoData.html_url) {
            if (repoData.private) {
                // Private repositories must have "private" as their repositoryURL value
                form.getComponent('repositoryURL').setValue("private")
            }
            else {
                form.getComponent('repositoryURL').setValue(repoData.html_url)
            }
        }

        // Updating forks
        if (repoData.forks_count !== undefined) {
            const reuseFrequencyComp = form.getComponent('reuseFrequency')
            const currentReuse = {}

            currentReuse.forks = repoData.forks_count
            reuseFrequencyComp.setValue(currentReuse)
        }

        // Updating license object
        if (repoData.license && repoData.license.spdx_id) {
            const permissionsComp = form.getComponent('permissions');
            const currentPermissions = permissionsComp.getValue() || {};

            currentPermissions.licenses = currentPermissions.licenses || [];
            const licenseURL = await getLicenseURL(repoData.html_url)

            const licenseObj = {
                name: repoData.license.spdx_id,
                URL: licenseURL
            };

            currentPermissions.licenses = [licenseObj];
            permissionsComp.setValue(currentPermissions);
        }

        // Update languages list by combining any the user has entered
        if (form.getComponent('languages') && languages) {
            const languagesComp = form.getComponent('languages')
            const newLanguages = Object.keys(languages) || []

            languagesComp.setValue(newLanguages)
        }

        // Update dates
        if (repoData.created_at && repoData.updated_at) {
            const dateComp = form.getComponent('date')
            const currentDate = dateComp.getValue() || {}

            currentDate.created = repoData.created_at;
            currentDate.lastModified = repoData.updated_at
            currentDate.metaDataLastUpdated = new Date().toISOString()

            dateComp.setValue(currentDate)
        }

        // Update tags
        if (repoData.topics) {
            const tagsComp = form.getComponent('tags')

            const newTags = [...repoData.topics] || []
            tagsComp.setValue(newTags)
        }

        // Update feedback mechanisms
        if (repoData.html_url) {
            const feedbackComp = form.getComponent('feedbackMechanism')

            const issuesUrl = repoData.html_url + "/issues"

            feedbackComp.setValue(issuesUrl)
        }

        // Update SBOM
        if (form.getComponent('SBOM') && repoData.html_url) {
            const upstreamComp = form.getComponent('SBOM');
            const urlParts = repoData.html_url.split('/')

            if (urlParts.length >= 2) {
                const org = urlParts[urlParts.length - 2]
                const repo = urlParts[urlParts.length - 1]

                const dependenciesUrl = `https://github.com/${org}/${repo}/network/dependencies`

                upstreamComp.setValue(dependenciesUrl)
            }
        }

        // Update repositoryHost
        if (form.getComponent('repositoryHost') && repoData.html_url) {
            if (repoData.html_url.includes('github.cms.gov')) {
                form.getComponent('repositoryHost').setValue('github.cms.gov')
            } else if (repoData.html_url.includes('github.com/CMSgov')) {
                form.getComponent('repositoryHost').setValue('github.com/CMSgov')
            } else if (repoData.html_url.includes('github.com/CMS-Enterprise')) {
                form.getComponent('repositoryHost').setValue('github.com/CMS-Enterprise')
            } else if (repoData.html_url.includes('github.com/DSACMS')) {
                form.getComponent('repositoryHost').setValue('github.com/DSACMS')
            }
        }

        // fields to potentially automate
        // clones, but this is only tracked for every 14 days 
        // status, by checking if its public, we can assume its production and check if its archival 
        // laborHours, by running a script? this might be harder since we need SCC
        // maturityModel, we could check to see if certain files / sections live within a repo and make a guess like that
        // usageType, by assuming that if its public = openSource and if private = governmnetWideReuse

        notificationSystem.success("Repository data loaded successfully!")

    } catch (error) {
        notificationSystem.error("Error filling form fields with repository data. Please refresh and try again")
        console.error("Form fill error:", error)
    }
}

// This is global so we could use this throughout the website!
window.showErrorNotification = function (message) {
    notificationSystem.error(message);
};

window.showSuccessNotification = function (message) {
    notificationSystem.success(message);
};