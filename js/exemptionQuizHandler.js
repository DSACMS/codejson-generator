function determineExemptions() {
    const quiz = document.querySelector(".exemptions-quiz");
    const quizContainer = document.querySelector(".exemptions-quiz-container");
    const resultsContainer = document.querySelector(".results");
    const exemptionResult = document.querySelector(".exemption-result");

    const checkedValues = Array.from(document.querySelectorAll("input[name='exemption-condition']:checked")).map((input) => input.value);

    console.log("Selected answers:", checkedValues);

    const results = determineResults(checkedValues);

    // Display results
    quizContainer.style.display = "none";
    resultsContainer.style.display = "block";
    exemptionResult.innerHTML = results;

}

function determineResults(checkedValues) {

    var text = "";

    // Project qualifies for the SHARE IT Act
    if (checkedValues.includes("none")) {
        text = `<h4>Your project is: <strong>NOT EXEMPTED</strong></h4>
                <p>Based on your selections, your project qualifies for the SHARE IT Act ✅</p>
                <p>If your repository is public, mark <code>usageType</code> as <strong>openSource</strong>.</p>
                <p>If your repository is private/internal, mark <code>usageType</code> as <strong>governmentWideReuse</strong>.</p>`;
    }
    // Project is exempted
    else {
        const selections = checkedValues.join(", ");
        text = `<h4>Your project is: <strong>EXEMPTED</strong></h4>
                <p>Based on your selections, your project is exempted from the SHARE IT Act ❌</p>
                <p>We've marked this in the form below for you as: <strong>${selections}</strong></p>
                <p>Be sure to include a 1–2 sentence justification in the <code>exemptionText</code> field to support the exemption determination.</p>`;

        // Applies value to usageType on form
        try {
            const form = window.formIOInstance
            form.getComponent('usageType').setValue(checkedValues);
        }
        catch {
            console.error("Form fill error:", error);
        }
    }

    return text;
}

function uncheckAllCheckboxes() {
    const checkboxes = document.querySelectorAll(".usa-checkbox__input");
    checkboxes.forEach((checkbox) => {
        checkbox.checked = false;
    });
}

function handleClick(event) {
    const quizContainer = document.querySelector(".exemptions-quiz-container");
    const resultsContainer = document.querySelector(".results");

    event.preventDefault();
    uncheckAllCheckboxes(); // Clear input

    resultsContainer.style.display = "none";
    quizContainer.style.display = "block";
}