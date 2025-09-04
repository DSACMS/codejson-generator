function determineExemptions(event) {
    const legislationName = event.target.id;

    const quizContainer = document.querySelector(`#${legislationName} .exemptions-quiz-container`);
    const resultsContainer = document.querySelector(`#${legislationName} .results`);
    const exemptionResult = document.querySelector(`#${legislationName} .exemption-result`);

    var values = Array.from(document.querySelectorAll(`#${legislationName} input[name='exemption-condition']:checked`)).map((input) => input.value);
    var checkedValues = [...new Set(values)];

    // If simple quiz and exempt, go directly to SHARE IT Act Quiz
    if (legislationName === "start" && (checkedValues.length === 0 || checkedValues[0] === "exempt")) {
        handleClick(event, true);
        return;
    }

    const results = determineResults(checkedValues, legislationName);

    // Display results
    quizContainer.style.display = "none";
    resultsContainer.style.display = "block";
    exemptionResult.innerHTML = results;
}

function determineResults(checkedValues, legislationName) {
    var text = "";

    // Project is not exempt - simple quiz
    if (legislationName == "start") {
        if (checkedValues[0] !== "exempt") {
            text = `<h3 class="usa-heading margin-top-neg-05">Your project is qualified for sharing and reuse according to the SHARE IT Act and M-16-21.</h3>
                <p>We've marked this in the form below for you as: <strong>${checkedValues[0]}</strong></p>`
        }
    }

    // Project is not exempt
    else if ((checkedValues.length === 1 && checkedValues[0].includes("none")) || checkedValues.length === 0) {

        if (legislationName === "share-it-act") {
            text = `<h3 class="usa-heading margin-top-neg-05">Your project is: <div class="not-exempt"><strong>NOT EXEMPTED</strong></div></h3>
                <p>Please complete <strong>Part 1c</strong> to determine additional project exemptions.</p>`;
        }
        else {
            text = `<h3 class="usa-heading margin-top-neg-05">Your project is: <div class="not-exempt"><strong>NOT EXEMPTED</strong></div></h3>
                <p>If your project is NOT exempted from both M-16-21 AND the SHARE IT Act, please mark the following on the form: </p>
                <p>If your repository is public, mark <code>usageType</code> as <strong>openSource</strong>.</p>
                <p>If your repository is private, mark <code>usageType</code> as <strong>governmentWideReuse</strong>.</p>`;
        }
    }
    // Project is exempted
    else {
        const selections = checkedValues.join(", ");
        text = `<h3 class="usa-heading margin-top-neg-05">Your project is: <strong>EXEMPTED</strong></h3>
                <p>We've marked this in the form below for you as: <strong>${selections}</strong></p>
                <p>Be sure to include a 1–2 sentence justification in the <code>exemptionText</code> field to support the exemption determination.</p>`;
    }

    setValue(checkedValues);

    return text;
}

function handleClick(event, exempt = false) {
    const legislationName = event.target.id;
    const quizContainer = document.querySelector(`#${legislationName}.exemptions`);
    var resultsContainer = document.querySelector(`#${legislationName} .results`);

    // Determine next quiz
    var nextQuiz = "";
    if (legislationName === "start") {
        if (exempt) {
            nextQuiz = "share-it-act";
        }
        else {
            nextQuiz = "start";
        }
    }
    else if (legislationName === "share-it-act") {
        nextQuiz = "m-16-21";
    }
    else {
        nextQuiz = "start";
    }

    event.preventDefault();
    resetQuiz(legislationName);

    // Display
    resultsContainer.style.display = "none";
    quizContainer.style.display = "none";

    const nextQuizDiv = document.querySelector(`#${nextQuiz}.exemptions`);
    const nextQuizContainer = document.querySelector(`#${nextQuiz} .exemptions-quiz-container`);
    nextQuizDiv.style.display = "block";
    nextQuizContainer.style.display = "block";
}

function setValue(checkedValues) {
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

function resetQuiz(legislationName) {
    var checkboxes = {};

    if (legislationName === "start") {
        checkboxes = document.querySelectorAll(`#${legislationName} .usa-radio__input`);
    }
    else {
        checkboxes = document.querySelectorAll(`#${legislationName} .usa-checkbox__input`);
    }

    checkboxes.forEach((checkbox) => {
        checkbox.checked = false;
    });
}

window.determineExemptions = determineExemptions;
window.handleClick = handleClick;