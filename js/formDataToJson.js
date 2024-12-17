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

	for (const key in data) {
		if (blankObject.hasOwnProperty(key)) {
			console.log(`${key}: ${data[key]}`);

			if(typeof data[key] === "object" && isMultiSelect(data[key])) {
				blankObject[key] = getSelectedOptions(data[key]);
			}
			else {
				blankObject[key] = data[key];
			}
			
		}
	}
}

function isMultiSelect(obj) {
	  for (const key in obj) {
		if (typeof obj[key] !== 'boolean') {
		  return false;
		}
	  }
	  return true; // Return true if all values are booleans
}

// Convert from dictionary to array
function getSelectedOptions(options) {
	let selectedOptions = [];

	for (let key in options) {
		if(options[key]) {
			selectedOptions.push(key);
		}
	}
	return selectedOptions;
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
