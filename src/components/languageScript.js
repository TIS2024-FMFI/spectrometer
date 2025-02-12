document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const selectedLang = urlParams.get('lang') || 'en';

    //Updates all texts
    updateTextContent();

    const currentUrl = window.location.href.split('?')[0]; // URL without params

    // If no language shown in URL, place there the current language
    if (urlParams.get('lang') == null) {
        window.location.href = `${currentUrl}?lang=${selectedLang}`;
    }

    // Update button hrefs with the current language parameter
    updateButtonLinks(selectedLang);

    const selectElement = document.getElementById('language');
    if (selectElement) {
        selectElement.value = selectedLang;

        // Add event listener to update language dynamically
        selectElement.addEventListener('change', () => {
            const newLang = selectElement.value;
            window.location.href = `${currentUrl}?lang=${newLang}`;
        });
    }
});

/**
 * Translates the words of the webpage tagged with "data-translate"
 */
function updateTextContent() {
    const urlParams = new URLSearchParams(window.location.search);
    const selectedLang = urlParams.get('lang') || 'en';

    fetch(`../languages/${selectedLang}.json`)
        .then(response => response.json())
        .then(translations => {
            document.querySelectorAll('[data-translate]').forEach(element => {
                const key = element.getAttribute('data-translate');
                const value = translations[key];

                if (value) {
                    element.innerHTML = value;
                }
            });
        }).catch(error => console.error("Error loading language file:", error));
}

/**
 * Updates href attributes of buttons based on the selected language
 * @param {string} lang - The selected language code
 */
function updateButtonLinks(lang) {
    // const buttons = document.querySelectorAll('.button-container a');
    const buttons = document.querySelectorAll('a');
    buttons.forEach(button => {
        const baseHref = button.getAttribute('href').split('?')[0]; // Strip query params
        button.setAttribute('href', `${baseHref}?lang=${lang}`);
    });
}
