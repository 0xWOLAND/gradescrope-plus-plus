const WORKER_URL = 'https://gradescope-grok-worker.bhargav-annem.workers.dev';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const DELAY = 10;

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

// Function to analyze all pages at once
async function analyzeImages(pages, _questions) {
    try {
        const imageUrls = pages.map(page => page.imageUrl).filter(url => url);
        const questions = _questions.map(question => ({number: question.number, id: question.id}));

        if (imageUrls.length === 0) {
            console.log('No valid image URLs found');
            return [];
        }

        const formData = new FormData();
        formData.append('imageUrls', JSON.stringify(imageUrls));
        formData.append('questions', JSON.stringify(questions));

        const response = await fetch(WORKER_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Worker error! status: ${response.status}`);
        }

        const result = await response.json();
        
        return result.images || [];
    } catch (error) {
        console.error('Error analyzing images:', error);
        return [];
    }
}


async function selectPagesAndQuestions(pages, questions) {
    const analysis = await analyzeImages(pages, questions);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27 }));
    
    for (let [idx, result] of analysis.entries()) {
        const questionsToPick = questions.filter(question => result.questions.includes(question.id));
        
        for (let question of questionsToPick) {
            await wait(DELAY);
            question.element.click();
            await wait(DELAY);
            pages[idx].checkboxButton.click();
            await wait(DELAY);
            question.element.click();
        }
    }
}

function setLoadingState(button, isLoading) {
    if (!button) return;
    
    let icon = button.querySelector('.fa');
    let spanText = button.querySelector('span:last-child');
    let spanOuter = button.querySelector('span');
    
    // If elements are missing, recreate them
    if (!spanOuter) {
        spanOuter = document.createElement('span');
        button.appendChild(spanOuter);
    }
    
    if (!icon) {
        icon = document.createElement('i');
        icon.setAttribute('role', 'img');
        icon.setAttribute('aria-hidden', 'true');
        spanOuter.insertBefore(icon, spanOuter.firstChild);
    }
    
    if (!spanText) {
        spanText = document.createElement('span');
        spanOuter.appendChild(spanText);
    }
    
    if (isLoading) {
        button.classList.add('loading');
        icon.className = 'fa';
        spanText.textContent = ' Analyzing...';
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        icon.className = 'fa fa-magic';
        spanText.textContent = ' Autofill';
        button.disabled = false;
    }
}

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
        try {
            setLoadingState(button, true);
            const questions = getQuestions();
            const pages = getPages();
            await selectPagesAndQuestions(pages, questions);
            console.log("Autofill complete");
            // Explicitly reset the button state after completion
            setLoadingState(button, false);
        } catch (error) {
            console.error('Error during autofill:', error);
            alert('An error occurred during autofill. Please check the console for details.');
            setLoadingState(button, false);
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