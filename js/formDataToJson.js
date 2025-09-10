// Retrieves file and returns as json object
async function retrieveFile(filePath) {
	try {
		const response = await fetch(filePath);

		if (!response.ok) {
			throw new Error("Network response was not ok");
		}
		// Returns file contents in a json format
		return await response.json();
	} catch (error) {
		console.error("There was a problem with the fetch operation:", error);
		return null;
	}
}

function isMultiSelect(obj) {
	if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
	for (const key in obj) {
		if (typeof obj[key] !== 'boolean') {
			return false;
		}
	}
	return true; // Returns true if all values are booleans
}

// Convert from dictionary to array
function getSelectedOptions(options) {
	let selectedOptions = [];

	for (let key in options) {
		if (options[key]) {
			selectedOptions.push(key);
		}
	}

	return selectedOptions;
}

function isEmptyObject(obj) {
	return Object.values(obj).every(value =>
		value === "" ||
		value === null ||
		value === undefined
	);
}

// Populates fields with form data
function populateObject(data, fields) {
	let reorderedObject = {}

	for (const field of fields) {
		let value = data[field];

		// Does not assign optional properties with blank values
		if (value == null || value === "" || (Array.isArray(value) && typeof value[0] === 'object' && isEmptyObject(value[0]))) {
			continue;
		}

		// Adjusts value accordingly if multi-select field
		if ((typeof value === "object" && isMultiSelect(value))) {
			value = getSelectedOptions(value);
		}
		// Recurses if multi-field object
		else if (typeof value === 'object' && !Array.isArray(value) && value !== null && Object.keys(value).length > 1) {
			value = populateObject(value, Object.keys(value));
		}

		reorderedObject[field] = value;
	}

	return reorderedObject;
}

async function populateCodeJson(data) {
	// Fetching schema based on search params
	const params = new URLSearchParams(window.location.search);
	const page = params.get("page") || "gov";
	const filePath = `schemas/${page}/schema.json`;

	// Retrieves schema with fields in correct order
	const schema = await retrieveFile(filePath);
	let codeJson = {};

	// Populates fields with form data
	if (schema) {
		codeJson = populateObject(data, Object.keys(schema.properties));
	} else {
		console.error("Failed to retrieve JSON data.");
	}

	return codeJson;
}

// Creates code.json object
async function createCodeJson(data) {
	delete data.submit;
	const codeJson = await populateCodeJson(data);

	window.gh_api_key = data['gh_api_key']
	console.log("TEST")
	console.log(window.gh_api_key)

	const jsonString = JSON.stringify(codeJson, null, 2);
	document.getElementById("json-result").value = jsonString;
}

// Copies code.json to clipboard
async function copyToClipboard(event) {
	event.preventDefault();

	var textArea = document.getElementById("json-result");
	textArea.select();
	document.execCommand("copy")
}

const NEW_BRANCH = 'code-json-branch' + Math.random().toString(36).substring(2, 10);

function getOrgAndRepoArgsGitHub(url) {
	const pattern = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)/;
	const match = url.match(pattern);

	if (match) {
		const owner = match[1];
		const repo = match[2];
		return { owner, repo };
	}
	else {
		throw new Error('Invalid URL!');
	}
}


async function createBranchOnProject(projectURL, token) {
	const { owner, repo } = getOrgAndRepoArgsGitHub(projectURL);

	const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/main`,
		{
			method: 'GET',
			headers: {
				'Authorization': 'token '.concat(token),
			},
		}
	);

	const data = await response.json();

	if (response.ok) {
		const sha = data.object.sha;

		const createBranchApiUrl = `https://api.github.com/repos/${owner}/${repo}/git/refs`;

		// Create the new branch from the base branch
		const newBranchResponse = await fetch(createBranchApiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `token ${token}`,
			},
			body: JSON.stringify({
				ref: `refs/heads/${NEW_BRANCH}`, // Name of the new branch
				sha: sha, // SHA of the base branch (main)
			}),
		});

		const newBranchData = await newBranchResponse.json();

		if (newBranchResponse.ok) {
			console.log('New branch created successfully: ', newBranchData);
			return true;
		}
		else {
			console.error('Error creating new branch: ', newBranchData);
			alert("Failed to create branch on project! Error code: " + newBranchResponse.status + ". Please check API Key permissions and try again.")
			return false;
		}
	}
	else {
		console.error('Error fetching base branch info:', data);
		alert('Error fetching base branch info:', data);
		return false;
	}
}


async function addFileToBranch(projectURL, token, codeJSONObj) {
	const { owner, repo } = getOrgAndRepoArgsGitHub(projectURL);
	const FILE_PATH = 'code.json'
	const createFileApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${FILE_PATH}`;
	const encodedContent = btoa(codeJSONObj);
	console.log("Content: ", encodedContent);
	console.log("Branch: ", NEW_BRANCH);

	const response = await fetch(createFileApiUrl,
		{
			method: 'PUT',
			headers: {
				'Accept': 'application/vnd.github+json',
				'Authorization': 'Bearer '.concat(token),
				'X-GitHub-Api-Version': "2022-11-28"
			},
			body: JSON.stringify({
				message: "Add codejson to project",
				committer: {
					name: "codejson-generator form site",
					email: "opensource@cms.hhs.gov"
				},
				content: encodedContent,
				branch: NEW_BRANCH,
			}),
		}
	);

	const data = await response.json()

	if (response.ok) {
		console.log('File added successfully: ', data);
		return true;
	}
	else {
		console.error('Error adding file: ', data);
		alert("Failed to add file on project! Error code: " + response.status + ". Please check API Key permissions and try again.")
		return false;
	}
}

async function createPR(projectURL, token) {
	const { owner, repo } = getOrgAndRepoArgsGitHub(projectURL);
	const createPrApiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls`;
	const response = await fetch(createPrApiUrl,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'token '.concat(token),
				'X-GitHub-Api-Version': "2022-11-28"
			},
			body: JSON.stringify({
				title: "Add code.json to Project",
				body: "Add generated code.json file to project. Code.json was generated via codejson-generator form site.",
				head: NEW_BRANCH,
				base: 'main',

			}),
		}
	);

	const data = await response.json();

	if (response.ok) {
		console.log('Pull request created successfully: ', data);
		return true;
	}
	else {
		console.error("Error creating PR!: ", data);
		alert("Failed to create PR on project! Error code: " + response.status + ". Please check API Key permissions and try again.")
		return false;
	}
}

// Creates PR on requested project
async function createProjectPR(event) {
	event.preventDefault();

	var textArea = document.getElementById("json-result");//Step 1
	var codeJSONObj = JSON.parse(textArea.value)

	if ('gh_api_key' in window) {
		var apiKey = window.gh_api_key;

		if ('repositoryURL' in codeJSONObj) {
			var prCreated = false;
			//Step 1
			const branchCreated = await createBranchOnProject(codeJSONObj.repositoryURL, apiKey);
			if (branchCreated) {
				const fileAdded = await addFileToBranch(codeJSONObj.repositoryURL, apiKey, textArea.value);

				if (fileAdded) {
					prCreated = await createPR(codeJSONObj.repositoryURL, apiKey);
					if (prCreated) {
						console.log("PR successfully created!");
						alert("PR has been created!");
					}
				}
			}
			else {
				console.error("Could not create branch on requested repository with the requested API key!");
				alert("Could not create branch on requested repository with the requested API key!");
			}
		}
		else {
			console.error("No URL found!");
			alert("No URL given for project! Please provide project URL in repositoryURL text box");
		}

	}
	else {
		console.error("No API key found!");
		alert("No API Key in submitted data! Please provide an API key");
	}
}

// Triggers local file download
async function downloadFile(event) {
	event.preventDefault();

	const codeJson = document.getElementById("json-result").value
	const jsonObject = JSON.parse(codeJson);
	const jsonString = JSON.stringify(jsonObject, null, 2) + "\n";
	const blob = new Blob([jsonString], { type: "application/json" });

	// Create anchor element and create download link
	const link = document.createElement("a");
	link.href = URL.createObjectURL(blob);
	link.download = "code.json";

	// Trigger the download
	link.click();
}

// Triggers email(mailtolink)
async function emailFile(event) {
	event.preventDefault();

	const codeJson = document.getElementById("json-result").value
	const jsonObject = JSON.parse(codeJson);

	try {
		const cleanData = { ...jsonObject };
		delete cleanData.submit;

		const jsonString = JSON.stringify(cleanData, null, 2);

		const subject = "Code.json generator Results";
		const body = `Hello,\n\nHere are the code.json results:\n\n${jsonString}\n\nThank you!`;

		const recipients = ["opensource@cms.hhs.gov"];

		const mailtoLink = `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

		window.location.href = mailtoLink;

		console.log("Email client opened");
	} catch {
		console.error("Error preparing email:", error);
		showNotificationModal("Error preparing email. Please try again or copy the data manually.", 'error');
	}
}

window.createCodeJson = createCodeJson;
window.copyToClipboard = copyToClipboard;
window.downloadFile = downloadFile;
window.createProjectPR = createProjectPR;
window.emailFile = emailFile;
