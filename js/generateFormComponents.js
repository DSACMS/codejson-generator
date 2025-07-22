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

// Function that handles validation object needed for each form component
function determineValidation(fieldName, fieldObject, requiredArray) {
	return {
		"required": requiredArray.includes(fieldName)
	}
}

// Function that determines type of form component based on field
function determineType(field) {
	if (field.type === "object") {
		return "container";
	} else if (field.type === "array") {
		// Array of objects
		if (field.items.type === "object") {
			return "datagrid"
		}
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
	}
	else if (field.type === "integer") {
		return "integer";
	} else if (field.type === "boolean") {
		return "select-boolean";
	} else if (field.type === "string" || field.type.includes("string")) {
		if (field.format == "date-time") {
			return "datetime";
		}
		return "textfield";
	}
}

// Creates Form.io component based on json field type
function createComponent(fieldName, fieldObject, requiredArray) {
	const componentType = determineType(fieldObject);
	const validate = determineValidation(fieldName, fieldObject, requiredArray);
	switch (componentType) {
		case "textfield":
			return {
				type: "textfield",
				key: fieldName,
				label: fieldName,
				input: true,
				description: fieldObject["description"],
				validate
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
				description: fieldObject["description"],
				validate
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
				validate
			};
		case "integer":
			return {
				label: fieldName,
				applyMaskOn: "change",
				mask: false,
				tableView: false,
				delimiter: false,
				requireDecimal: false,
				decimalLimit: 0,
				inputFormat: "plain",
				truncateMultipleSpaces: false,
				validateWhenHidden: false,
				key: fieldName,
				type: "number",
				input: true,
				description: fieldObject["description"],
				validate
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
				description: fieldObject["description"],
				validate
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
				description: fieldObject["description"],
				validate
			};
		case "datetime":
			return {
				label: fieldName,
				tableView: false,
				datePicker: {
					disableWeekends: false,
					disableWeekdays: false
				},
				enableTime: false,
				validateWhenHidden: false,
				key: fieldName,
				type: "datetime",
				input: true,
				widget: {
					type: "calendar",
					displayInTimezone: "viewer",
					locale: "en",
					useLocaleSettings: false,
					allowInput: true,
					mode: "single",
					noCalendar: false,
					format: "yyyy-MM-dd",
					disableWeekends: false,
					disableWeekdays: false,
				},
				description: fieldObject["description"],
				validate
			};
		case "select-boolean":
			return {
				label: fieldName,
				widget: "html5",
				tableView: true,
				data: {
					values: [
						{
							label: "True",
							value: "true"
						},
						{
							label: "False",
							value: "false"
						}
					]
				},
				validateWhenHidden: false,
				key: fieldName,
				type: "select",
				input: true,
				description: fieldObject["description"],
				validate
			};
		case "container":
			return {
				label: fieldName,
				hideLabel: false,
				tableView: false,
				validateWhenHidden: false,
				key: fieldName,
				type: "container",
				input: true,
				components: [],
				description: fieldObject["description"],
				validate
			};
		case "datagrid":
			return {
				label: fieldName,
				reorder: false,
				addAnotherPosition: "bottom",
				layoutFixed: false,
				enableRowGroups: false,
				initEmpty: false,
				tableView: false,
				defaultValue: [
					{}
				],
				validateWhenHidden: false,
				key: fieldName,
				type: "datagrid",
				input: true,
				components: [],
				validate
			};
		default:
			break;
	}
}

// Adds heading containing schema information
function createFormHeading(title, description) {
	const container = document.getElementById('form-header');
	container.innerHTML = `
	<h1>${title}</h1>\n
	<h2>${description}</h2>\n
	<h3>Complete the form below to create a code.json file for your project:</h3>\n
	`;
}

function createExemptionsBox() {
	const container = document.getElementById("exemptions-header")
	container.innerHTML = `<h3>Is my project exempted?</h3> \n <h4> Answer the series of questions below to determine if your project falls under the 4 exemption categories according to the SHARE IT Act. </h4>`
}

function createAutoGenerationBox() {
	const container = document.getElementById("auto-generation-header")
	container.innerHTML = `<h3>Auto Generate Fields</h3> \n <h4> Please enter your repositories GitHub URL in order to automatically pre-fill some of the fields in this form! </h4> \n <h6> <i>This currently only works on <b>public</b> repositories</i> </h6>`
}

// Iterates through each json field and creates component array for Form.io
function createAllComponents(schema, prefix = "") {
	let components = [];

	if (schema.type === "object" && schema.properties) {

		const items = schema.properties.hasOwnProperty("items") ? schema.properties.items : schema.properties;

		let requiredArray = [];
		if (schema.hasOwnProperty("required")) {
			requiredArray = schema.required;
		}

		for (const [key, value] of Object.entries(items)) {

			console.log("key at play:", key);
			const fullKey = prefix ? `${prefix}.${key}` : key;

			let fieldComponent = createComponent(key, value, requiredArray);

			if (fieldComponent.type === "container") {
				fieldComponent.components = createAllComponents(value, fullKey);
			}
			else if (fieldComponent.type === "datagrid") {
				fieldComponent.components = createAllComponents(value.items, fullKey);
			}

			components.push(fieldComponent);
		}
	}

	return components;
}

// Creates complete form based on input json schema
async function createFormComponents() {
	let components = [];

	// Fetching schema based on search params
	const params = new URLSearchParams(window.location.search);
	const page = params.get("page") || "gov";
	const filePath = `schemas/${page}/schema.json`;
	const jsonData = await retrieveFile(filePath);
	console.log("JSON Data:", jsonData);

	createFormHeading(jsonData["title"], jsonData["description"]);
	createExemptionsBox()
	createAutoGenerationBox()

	components = createAllComponents(jsonData);

	//Form text box to input GitHub API Key
	components.push({
		"label": "GitHub API Key (optional)",
		"disableSortingAndFiltering": false,
		"tableView": true,
		"key": "gh_api_key",
		"type": "password",
		"input": true,
		"description": "Generate a Github API Key from here: https://github.com/settings/tokens/new .\n\
			The token should have these permissions: \n\
			- Contents: read & write \n- Workflows: read & write\
			- Pull requests: read & write"
	});

	// Add submit button to form
	components.push({
		type: "button",
		label: "Generate code.json metadata",
		key: "submit",
		disableOnInvalid: false,
		input: true,
		tableView: false,
	});



	console.log(components);

	return components;
}

window.createFormComponents = createFormComponents;