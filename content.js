// Configuration
const WORKER_URL = 'https://gradescope-grok-worker.bhargav-annem.workers.dev';

// Helper function to wait between actions
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to get all questions from the outline
function getQuestions() {
    const questions = [];
    const questionItems = document.querySelectorAll('.selectPagesQuestionOutline--item');
    
    questionItems.forEach(item => {
        const titleElement = item.querySelector('.selectPagesQuestionOutline--title');
        const pointsElement = item.querySelector('.selectPagesQuestionOutline--points');
        
        if (titleElement && pointsElement) {
            const titleText = titleElement.textContent;
            const [questionNumber, questionId] = titleText.split(' ');
            
            questions.push({
                number: questionNumber.trim(),
                id: questionId.trim(),
                points: pointsElement.textContent.trim(),
                element: item
            });
        }
    });
    
    return questions;
}

// Function to get all pages
function getPages() {
    const pages = [];
    const pageItems = document.querySelectorAll('.selectPagesPage');
    
    pageItems.forEach(item => {
        const numberElement = item.querySelector('.pageThumbnail--number-current');
        const pageNumber = numberElement ? numberElement.textContent : '';
        
        const imageElement = item.querySelector('.selectPagesPage--image');
        const backgroundImage = imageElement ? imageElement.style.backgroundImage : '';
        const imageUrl = backgroundImage.replace(/^url\(['"](.+)['"]\)$/, '$1');
        
        const checkboxButton = item.querySelector('.pageThumbnail--selector');
        
        pages.push({
            number: pageNumber,
            imageUrl: imageUrl,
            element: item,
            checkboxButton: checkboxButton
        });
    });
    
    return pages;
}

// Function to analyze a single page
async function analyzeImage(page, questions) {
    try {
        if (!page.imageUrl) {
            console.log(`Skipping page ${page.number} - no image URL`);
            return [];
        }

        const formData = new FormData();
        formData.append('imageUrl', page.imageUrl);
        formData.append('questions', JSON.stringify(questions));

        const response = await fetch(WORKER_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Worker error! status: ${response.status}`);
        }

        const visibleQuestionIds = await response.json();
        console.log(`Page ${page.number} visible questions:`, visibleQuestionIds);
        
        return visibleQuestionIds;
    } catch (error) {
        console.error(`Error analyzing page ${page.number}:`, error);
        return [];
    }
}

// Function to find question element by ID
function findQuestionElement(questionId) {
    const questions = getQuestions();
    return questions.find(q => q.id === questionId)?.element;
}

// Function to sequentially select pages and questions
async function selectPagesAndQuestions(pages, questions) {
    for (const page of pages) {
        try {
            // Get visible questions for this page
            const visibleQuestionIds = await analyzeImage(page, questions);
            if (visibleQuestionIds.length === 0) continue;

            console.log(`Processing page ${page.number} with questions:`, visibleQuestionIds);

            // For each visible question on this page
            for (const questionId of visibleQuestionIds) {
                try {
                    // First, select the page
                    if (page.checkboxButton) {
                        page.checkboxButton.click();
                        await wait(500); // Wait for UI to update
                    }

                    // Then find and click the question
                    const questionElement = findQuestionElement(questionId);
                    if (questionElement) {
                        questionElement.click();
                        await wait(500); // Wait between question selections
                    } else {
                        console.warn(`Question element not found for ID: ${questionId}`);
                    }
                } catch (error) {
                    console.error(`Error selecting question ${questionId} on page ${page.number}:`, error);
                }
            }

            await wait(1000); // Wait between pages
        } catch (error) {
            console.error(`Error processing page ${page.number}:`, error);
            await wait(2000); // Longer wait after errors
        }
    }
}

// Function to show loading state
function setLoadingState(button, isLoading) {
    if (!button) return;
    
    const icon = button.querySelector('.fa');
    const spanText = button.querySelector('span:last-child');
    
    if (!icon || !spanText) return;
    
    if (isLoading) {
        icon.className = 'fa fa-spinner fa-spin';
        spanText.textContent = ' Analyzing...';
        button.disabled = true;
    } else {
        icon.className = 'fa fa-magic';
        spanText.textContent = ' Autofill';
        button.disabled = false;
    }
}

// Function to add the Autofill button
function addAutofillButton() {
    if (!window.location.href.includes('/select_pages')) return;
    if (document.getElementById('autofill-button')) return;
    
    const actionList = document.querySelector('.actionBar--actionList');
    if (!actionList) return;

    const listItem = document.createElement('li');
    const button = document.createElement('button');
    button.id = 'autofill-button';
    button.type = 'button';
    button.className = 'tiiBtn tiiBtn-secondary actionBar--action';
    
    const spanOuter = document.createElement('span');
    const icon = document.createElement('i');
    icon.className = 'fa fa-magic';
    icon.setAttribute('role', 'img');
    icon.setAttribute('aria-hidden', 'true');
    const spanText = document.createElement('span');
    spanText.textContent = ' Autofill';
    
    spanOuter.appendChild(icon);
    spanOuter.appendChild(spanText);
    button.appendChild(spanOuter);
    listItem.appendChild(button);
    
    button.addEventListener('click', async () => {
        const buttonRef = button;
        try {
            setLoadingState(buttonRef, true);

            const questions = getQuestions();
            const pages = getPages();
            console.log('Starting auto-selection with:', {
                pages: pages.length,
                questions: questions.length
            });
            
            await selectPagesAndQuestions(pages, questions);
            
            console.log('Auto-selection complete');
        } catch (error) {
            console.error('Error during autofill:', error);
            alert('An error occurred during autofill. Please check the console for details.');
        } finally {
            setLoadingState(buttonRef, false);
        }
    });
    
    const submitButton = actionList.querySelector('li:last-child');
    actionList.insertBefore(listItem, submitButton);
}

// Run immediately
addAutofillButton();

// Watch for DOM changes
const observer = new MutationObserver(() => {
    addAutofillButton();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});