function determineExemptions(event) {
    const legislationName = event.target.id;

    const quizContainer = document.querySelector(`#${legislationName} .exemptions-quiz-container`);
    const resultsContainer = document.querySelector(`#${legislationName} .results`);
    const exemptionResult = document.querySelector(`#${legislationName} .exemption-result`);

    var values = Array.from(document.querySelectorAll(`#${legislationName} input[name='exemption-condition']:checked`)).map((input) => input.value);
    var checkedValues = [...new Set(values)];

    const results = determineResults(checkedValues, legislationName);

    // Display results
    quizContainer.style.display = "none";
    resultsContainer.style.display = "block";
    exemptionResult.innerHTML = results;
}

function determineResults(checkedValues, legislationName) {
    var text = "";

    // Project is not exempted
    if (checkedValues.length === 1 && checkedValues[0].includes("none")) {

        if (legislationName === "share-it-act") {
            text = `<h4>Your project is: <div class="not-exempt"><strong>NOT EXEMPTED</strong></div></h4>
                <p>Please complete <strong>Part 2</strong> to determine additional project exemptions.</p>`;
        }
        else {
            text = `<h4>Your project is: <div class="not-exempt"><strong>NOT EXEMPTED</strong></div></h4>
                <h5>If your project is NOT exempted from both M-16-21 AND the SHARE IT Act, please mark the following on the form: </h5>
                <p>If your repository is public, mark <code>usageType</code> as <strong>openSource</strong>.</p>
                <p>If your repository is private, mark <code>usageType</code> as <strong>governmentWideReuse</strong>.</p>`;
        }
    }
    // Project is exempted
    else {
        const selections = checkedValues.join(", ");
        text = `<h4>Your project is: <strong>EXEMPTED</strong></h4>
                <p>We've marked this in the form below for you as: <strong>${selections}</strong></p>
                <p>Be sure to include a 1–2 sentence justification in the <code>exemptionText</code> field to support the exemption determination.</p>`;

        // Applies value to usageType on form
        try {
            const form = window.formIOInstance

            const component = form.getComponent('usageType');
            var currentSelection = component.getValue() || [];

            checkedValues.forEach(selected => {
                currentSelection[selected] = true;
            });

            form.getComponent('usageType').setValue(currentSelection);
        }
        catch (error) {
            console.error("Form fill error:", error);
        }
    }

    return text;
}

function handleClick(event) {
    const legislationName = event.target.id;

    const quizContainer = document.querySelector(`#${legislationName} .exemptions-quiz-container`);
    const resultsContainer = document.querySelector(`#${legislationName} .results`);

    event.preventDefault();
    //Uncheck checkboxes
    const checkboxes = document.querySelectorAll(`#${legislationName} .usa-checkbox__input`);
    checkboxes.forEach((checkbox) => {
        checkbox.checked = false;
    });

    resultsContainer.style.display = "none";
    quizContainer.style.display = "block";
}

window.determineExemptions = determineExemptions;
window.handleClick = handleClick;