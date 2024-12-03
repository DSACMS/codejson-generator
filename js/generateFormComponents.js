// Retrieves file and returns as json object
async function retrieveFile(filePath) {
	try {
		const response = await fetch(filePath);

		// Check if the response is OK (status code 200)
		if (!response.ok) {
			throw new Error("Network response was not ok");
		}
		// Return the parsed JSON content
		return await response.json();
	} catch (error) {
		console.error("There was a problem with the fetch operation:", error);
		return null;
	}
}

// Creates Form.io component based on json fields
// Supports text field for now
// TODO: Create components for number, select, and multi-select
function createComponent(fieldName, fieldObject) {
	switch (fieldObject["type"]) {
		case "string":
			return {
				type: "textfield",
				key: fieldName,
				label: fieldName,
				input: true,
				tooltip: fieldObject["description"],
				description: fieldObject["description"],
			};
		default:
			break;
	}
}

// Iterates through each json field and creates component array for Form.io
async function createFormComponents() {
	let components = [];
	let formFields = {};

	const filePath = "schemas/schema.json";
	let jsonData = await retrieveFile(filePath);
	console.log("JSON Data:", jsonData);

	formFields = jsonData["properties"];
	console.log("form Fields:", formFields);

	for (const key in formFields) {
		console.log(`${key}:`, formFields[key]);
		var fieldComponent = createComponent(key, formFields[key]);
		components.push(fieldComponent);
	}

	// Add submit button to form
	components.push({
		type: "button",
		label: "Submit",
		key: "submit",
		disableOnInvalid: true,
		input: true,
		tableView: false,
	});

	console.log(components);

	return components;
}

window.createFormComponents = createFormComponents;
