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

// Populates blank code.json object with values from form
function populateObject(data, blankObject) {
	for (let key in data) {
		console.log("current key", key);
		console.log("check if value exists", data.hasOwnProperty(key));
		if (blankObject.hasOwnProperty(key)) {
			if (typeof data[key] === "object" && data[key] !== null) {
				// If object, recursively populate
				// TODO: test out for permissions and description objects
				populateObject(data[key], blankObject[key]);
			} else {
				// Add value
				blankObject[key] = data[key];
			}
		}
	}
}

async function populateCodeJson(data) {
	// Path to the blank json file
	const filePath = "schemas/template-code.json";

	let codeJson = await retrieveFile(filePath);

	if (codeJson) {
		populateObject(data, codeJson);
	} else {
		console.error("Failed to retrieve JSON data.");
	}

	console.log("FINAL CODE JSON HERE", codeJson);
	return codeJson;
}

// Creates code.json and triggers file download
async function downloadFile(data) {
	delete data.submit;
	const codeJson = await populateCodeJson(data);

	const jsonString = JSON.stringify(codeJson, null, 2);
	const blob = new Blob([jsonString], { type: "application/json" });

	// Create anchor element and create download link
	const link = document.createElement("a");
	link.href = URL.createObjectURL(blob);
	link.download = "code.json";

	// Trigger the download
	link.click();
}

window.downloadFile = downloadFile;
