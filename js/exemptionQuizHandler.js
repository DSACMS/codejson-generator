function determineExemptions() {
    const quiz = document.querySelector(".exemptions-quiz");
    const quizContainer = document.querySelector(".exemptions-quiz-container");
    const resultsContainer = document.querySelector(".results");
    const exemptionResult = document.querySelector(".exemption-result");

    const checkedValues = Array.from(
        document.querySelectorAll("input[name='exemption-condition']:checked")
    ).map((input) => input.value);

    console.log("Selected answers:", checkedValues);

    // Display results
    quizContainer.style.display = "none";
    resultsContainer.style.display = "block";
    exemptionResult.innerHTML = `Your project is: <strong>EXEMPTED</strong><br />
                              <p>This will be denoted by. The field has been filled out according in the form below.</p>`;
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