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
function createComponent(fieldName, fieldObject) {
	const componentType = determineType(fieldObject);
	switch (componentType) {
		case "textfield":
			return {
				type: "textfield",
				key: fieldName,
				label: fieldName,
				input: true,
				description: fieldObject["description"]
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
				description: fieldObject["description"]
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
		case "datetime":
			return {
				label: fieldName,
				tableView: false,
				datePicker: {
					disableWeekends: false,
					disableWeekdays: false
				},
				enableMinDateInput: false,
				enableMaxDateInput: false,
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
					enableTime: true,
					noCalendar: false,
					format: "yyyy-MM-dd hh:mm a",
					hourIncrement: 1,
					minuteIncrement: 1,
					time_24hr: false,
					minDate: null,
					disableWeekends: false,
					disableWeekdays: false,
					maxDate: null
				},
				description: fieldObject["description"]
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
				description: fieldObject["description"]
			};
		case "container": 
			return {
				label: fieldName,
				tableView: false,
				validateWhenHidden: false,
				key: fieldName,
				type: "container",
				input: true,
				components: []
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
				components: []
			}; 
		default:
			break;
	}
}

// Adds heading containing schema information
function createFormHeading(title, description) {
	const container = document.getElementById('form-header');
	container.innerHTML = `<h1>${title}</h1>\n<h2>${description}</h2>`;
}

// Iterates through each json field and creates component array for Form.io
function createAllComponents(schema, prefix = ""){
	let components = [];

	if (schema.type === "object" && schema.properties) {

		const items = schema.properties.hasOwnProperty("items") ? schema.properties.items : schema.properties

        for (const [key, value] of Object.entries(items)) {
            
			console.log("key at play:", key);
			const fullKey = prefix ? `${prefix}.${key}` : key;

			let fieldComponent = createComponent(key, value);

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

	const filePath = "schemas/schema-0.0.0.json";
	const jsonData = await retrieveFile(filePath);
	console.log("JSON Data:", jsonData);

	createFormHeading(jsonData["title"], jsonData["description"]);

	components = createAllComponents(jsonData);

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
