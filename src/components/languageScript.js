document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const selectedLang = urlParams.get('lang') || 'en';

    fetch(`../languages/${selectedLang}.json`)
        .then(response => response.json())
        .then(translations => updateTextContent(translations))
        .catch(error => console.error("Error loading language file:", error));

    const selectElement = document.getElementById('language');
    selectElement.value = selectedLang;

    // Update button hrefs with the current language parameter
    updateButtonLinks(selectedLang);

    // Add event listener to update language dynamically
    selectElement.addEventListener('change', () => {
        const newLang = selectElement.value;
        const currentUrl = window.location.href.split('?')[0]; // Strip query params
        window.location.href = `${currentUrl}?lang=${newLang}`;
    });
});

/**
 * Translates the words of the webpage tagged with "data-translate"
 * @param translations
 */
function updateTextContent(translations) {
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        const value = translations[key];

        if (value) {
            element.textContent = value;
        }
    });
}

/**
 * Updates href attributes of buttons based on the selected language
 * @param {string} lang - The selected language code
 */
function updateButtonLinks(lang) {
    const buttons = document.querySelectorAll('.button-container a');
    buttons.forEach(button => {
        const baseHref = button.getAttribute('href').split('?')[0]; // Strip query params
        button.setAttribute('href', `${baseHref}?lang=${lang}`);
    });
}
