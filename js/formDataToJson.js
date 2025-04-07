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
	  if(options[key]) {
		  selectedOptions.push(key);
	  }
  }
  return selectedOptions;
}

// Populates fields with form data
function populateObject(data, schema) {
	let reorderedObject = {}

	// Array of fields following proper order of fields in schema
	const fields = Object.keys(schema.properties.items);

	for (const key of fields) {
		let value = data[key];

		// Adjusts value accordingly if multi-select field
		if((typeof value === "object" && isMultiSelect(value))) {
			value = getSelectedOptions(value);
		}

		reorderedObject[key] = value;
	}

	return reorderedObject;
}

async function populateCodeJson(data) {
	const filePath = "schemas/schema.json";

	// Retrieves schema with fields in correct order
	const schema = await retrieveFile(filePath);
	let codeJson = {};

	// Populates fields with form data
	if (schema) {
		codeJson = populateObject(data, schema);
	} else {
		console.error("Failed to retrieve JSON data.");
	}

	return codeJson;
}

// Creates code.json object
async function createCodeJson(data) {
	delete data.submit;
	const codeJson = await populateCodeJson(data);

	const jsonString = JSON.stringify(codeJson, null, 2);
	document.getElementById("json-result").value = jsonString;
}

// Copies code.json to clipboard
async function copyToClipboard(event){
	event.preventDefault();

	var textArea = document.getElementById("json-result");
    textArea.select();
	document.execCommand("copy")
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

window.createCodeJson = createCodeJson;
window.copyToClipboard = copyToClipboard;
window.downloadFile = downloadFile;
