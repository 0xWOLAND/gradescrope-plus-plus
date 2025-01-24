// Function to change squares from grey to green
function changeSquareColors() {
    // Target the specific squares on the page selection interface
    const greySquares = document.querySelectorAll('.page-image-container');
    
    console.log('Checking for squares...');
    if (greySquares.length > 0) {
        console.log('Found squares:', greySquares.length);
        greySquares.forEach(square => {
            square.style.backgroundColor = 'rgb(76, 175, 80)';
            square.style.border = '2px solid rgb(69, 160, 73)';
        });
    }
}

// Function to add the Autofill button
function addAutofillButton() {
    // Check if we're on the select_pages URL
    if (!window.location.href.includes('/select_pages')) return;
    
    // Check if button already exists
    if (document.getElementById('autofill-button')) return;
    
    // Find the action list in the action bar
    const actionList = document.querySelector('.actionBar--actionList');
    if (!actionList) return;

    // Create list item
    const listItem = document.createElement('li');
    
    // Create the button with Gradescope's style
    const button = document.createElement('button');
    button.id = 'autofill-button';
    button.type = 'button';
    button.className = 'tiiBtn tiiBtn-secondary actionBar--action';
    
    // Create span structure to match Gradescope's button style
    const spanOuter = document.createElement('span');
    const icon = document.createElement('i');
    icon.className = 'fa fa-magic';
    icon.setAttribute('role', 'img');
    icon.setAttribute('aria-hidden', 'true');
    const spanText = document.createElement('span');
    spanText.textContent = ' Autofill';
    
    // Assemble the button
    spanOuter.appendChild(icon);
    spanOuter.appendChild(spanText);
    button.appendChild(spanOuter);
    listItem.appendChild(button);
    
    // Add click handler
    button.addEventListener('click', () => {
        changeSquareColors();
    });
    
    // Insert before the Submit button (last item in the list)
    const submitButton = actionList.querySelector('li:last-child');
    actionList.insertBefore(listItem, submitButton);
}

// Run immediately
addAutofillButton();
changeSquareColors();

// Watch for DOM changes
const observer = new MutationObserver(() => {
    console.log('DOM changed');
    addAutofillButton();
    changeSquareColors();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
}); 