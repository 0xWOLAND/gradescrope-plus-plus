// Function to get all questions from the outline
function getQuestions() {
    const questions = [];
    const questionItems = document.querySelectorAll('.selectPagesQuestionOutline--item');
    
    questionItems.forEach(item => {
        const titleElement = item.querySelector('.selectPagesQuestionOutline--title');
        const pointsElement = item.querySelector('.selectPagesQuestionOutline--points');
        
        if (titleElement && pointsElement) {
            const titleText = titleElement.textContent; // e.g., "1 2.1"
            const [questionNumber, questionId] = titleText.split(' '); // Split into ["1", "2.1"]
            
            questions.push({
                number: questionNumber.trim(),
                id: questionId.trim(),
                points: pointsElement.textContent.trim(),
                element: item
            });
        }
    });
    
    console.log('Found questions:', questions);
    return questions;
}

// Function to get all pages
function getPages() {
    const pages = [];
    const pageItems = document.querySelectorAll('.selectPagesPage');
    
    pageItems.forEach(item => {
        // Get the page number
        const numberElement = item.querySelector('.pageThumbnail--number-current');
        const pageNumber = numberElement ? numberElement.textContent : '';
        
        // Get the page image URL
        const imageElement = item.querySelector('.selectPagesPage--image');
        const backgroundImage = imageElement ? imageElement.style.backgroundImage : '';
        const imageUrl = backgroundImage.replace(/^url\(['"](.+)['"]\)$/, '$1');
        
        // Get the checkbox button
        const checkboxButton = item.querySelector('.pageThumbnail--selector');
        
        pages.push({
            number: pageNumber,
            imageUrl: imageUrl,
            element: item,
            checkboxButton: checkboxButton
        });
    });
    
    console.log('Found pages:', pages);
    return pages;
}

// Function to convert image URL to base64
async function getBase64Image(imageUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';  // Try to request CORS access
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/jpeg');
            resolve(dataURL);
        };
        img.onerror = () => {
            // If CORS fails, try without crossOrigin
            const imgRetry = new Image();
            imgRetry.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = imgRetry.width;
                canvas.height = imgRetry.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(imgRetry, 0, 0);
                const dataURL = canvas.toDataURL('image/jpeg');
                resolve(dataURL);
            };
            imgRetry.onerror = (error) => {
                console.error('Error loading image:', error);
                reject(error);
            };
            // Try to load the image directly
            imgRetry.src = imageUrl;
        };
        // First try with CORS
        img.src = imageUrl;
    });
}

// Function to analyze a single image for all questions
async function analyzeImage(page, questions) {
    try {
        // Skip if no image URL
        if (!page.imageUrl) {
            console.log(`Skipping page ${page.number} - no image URL`);
            return [];
        }
        console.log("Page URL: ", page.imageUrl);

        // Convert image to base64
        const base64Image = await getBase64Image(page.imageUrl);
        console.log("Converted to base64");

        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer xai-QE2kSBsIXNqpA9EFFXL7bXFbQO5xLx6fFL0uRJd3FCEDkbU4XAXWLVJOhpQjBO01npW278VKkmgjZf86'
            },
            body: JSON.stringify({
                model: "grok-vision-beta",
                messages: [
                    {
                        "role": "system",
                        "content": "You are an image relevance scorer. Rate how well the image matches each question number on a scale of 0-100."
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": `Rate how relevant this image is (0-100) for each question number: ${questions.map(q => q.id).join(', ')}. Respond with ONLY a JSON object like {"2.1": 85, "2.2": 30}`
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": base64Image
                                }
                            }
                        ]
                    }
                ],
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
            throw new Error('Invalid response format from API');
        }

        let scores;
        try {
            scores = JSON.parse(data.choices[0].message.content.trim());
        } catch (e) {
            console.error('Failed to parse API response:', data.choices[0].message.content);
            throw new Error('Failed to parse scores from API response');
        }

        // Convert scores object to array of results
        return Object.entries(scores).map(([questionId, score]) => ({
            pageNumber: page.number,
            questionId,
            relevanceScore: parseInt(score) || 0,
            page
        }));
    } catch (error) {
        console.error(`Error analyzing page ${page.number}:`, error);
        return [];
    }
}

// Function to analyze all pages
async function analyzeAllPages(pages, questions) {
    const allResults = [];
    for (const page of pages) {
        console.log(`Analyzing page ${page.number}...`);
        try {
            const pageResults = await analyzeImage(page, questions);
            if (pageResults.length > 0) {
                allResults.push(...pageResults);
                // Add a longer delay between successful requests
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error(`Failed to analyze page ${page.number}:`, error);
            // Add a longer delay after errors
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    return allResults;
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
    
    // Update click handler
    button.addEventListener('click', async () => {
        const questions = getQuestions();
        const pages = getPages();
        console.log('Questions for autofill:', questions);
        console.log('Pages for autofill:', pages);
        
        console.log('Starting page analysis...');
        const results = await analyzeAllPages(pages, questions);
        console.log('Analysis complete:', results);
        
        // Group results by question
        const resultsByQuestion = {};
        results.forEach(result => {
            if (!resultsByQuestion[result.questionId]) {
                resultsByQuestion[result.questionId] = [];
            }
            resultsByQuestion[result.questionId].push(result);
        });
        
        // For each question, select pages with high relevance scores
        Object.entries(resultsByQuestion).forEach(([questionId, questionResults]) => {
            // Sort by relevance score in descending order
            const relevantPages = questionResults
                .filter(result => result.relevanceScore > 50) // Adjust threshold as needed
                .sort((a, b) => b.relevanceScore - a.relevanceScore);
                
            // Select the pages for this question
            relevantPages.forEach(result => {
                if (result.page.checkboxButton && !result.page.checkboxButton.classList.contains('selected')) {
                    result.page.checkboxButton.click();
                }
            });
        });
    });
    
    // Insert before the Submit button (last item in the list)
    const submitButton = actionList.querySelector('li:last-child');
    actionList.insertBefore(listItem, submitButton);
}

// Run immediately
addAutofillButton();

// Watch for DOM changes
const observer = new MutationObserver(() => {
    console.log('DOM changed');
    addAutofillButton();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
}); 