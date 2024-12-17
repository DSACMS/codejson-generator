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

function transformArrayToOptions(arr) {
	return arr.map((item) => ({
		label: item.toString(),
		value: item.toString(),
	}));
}

function determineType(field) {
	if (field.type === "array") {
		// Multi-select
		if (field.items.hasOwnProperty("enum")) {
			return "selectboxes";
		}
		// Free response list
		return "tags";
	} else if (field.hasOwnProperty("enum")) {
		// Single select
		return "radio";
	} else if (field.type === "number") {
		return "number";
	} else if (field.type === "string") {
		return "textfield";
	}
}

// Creates Form.io component based on json field type
function createComponent(fieldName, fieldObject) {
	var componentType = determineType(fieldObject);
	switch (componentType) {
		case "textfield":
			return {
				type: "textfield",
				key: fieldName,
				label: fieldName,
				input: true,
				tooltip: fieldObject["description"],
				description: fieldObject["description"],
			};
		case "tags":
			return {
				label: fieldName,
				tableView: false,
				storeas: "array",
				validateWhenHidden: false,
				key: fieldName,
				type: "tags",
				input: true,
				description: fieldObject["description"]
			};
		case "number":
			return {
				label: fieldName,
				applyMaskOn: "change",
				mask: false,
				tableView: false,
				delimiter: false,
				requireDecimal: false,
				inputFormat: "plain",
				truncateMultipleSpaces: false,
				validateWhenHidden: false,
				key: fieldName,
				type: "number",
				input: true,
				description: fieldObject["description"],
			};
		case "radio":
			var options = transformArrayToOptions(fieldObject.enum);
			console.log("checking options here:", options);
			return {
				label: fieldName,
				optionsLabelPosition: "right",
				inline: false,
				tableView: false,
				values: options,
				validateWhenHidden: false,
				key: fieldName,
				type: "radio",
				input: true,
				description: fieldObject["description"]
			};
		case "selectboxes":
			var options = transformArrayToOptions(fieldObject.items.enum);
			console.log("checking options here:", options);
			return {
				label: fieldName,
				optionsLabelPosition: "right",
				tableView: false,
				values: options,
				validateWhenHidden: false,
				key: fieldName,
				type: "selectboxes",
				input: true,
				inputType: "checkbox",
				description: fieldObject["description"]
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
