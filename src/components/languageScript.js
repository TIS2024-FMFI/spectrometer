document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const selectedLang = urlParams.get('lang') || 'en';

    fetch(`../languages/${selectedLang}.json`)
        .then(response => response.json())
        .then(translations => updateTextContent(translations))
        .catch(error => console.error("Error loading language file:", error));
    const selectElement = document.getElementById('language');
    selectElement.value = selectedLang;
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

document.getElementById('apply-language').addEventListener('click', () => {
    const selectedLang = document.getElementById('language').value;
    const currentUrl = window.location.href.split('?')[0]; // Strip query params
    window.location.href = `${currentUrl}?lang=${selectedLang}`;
});