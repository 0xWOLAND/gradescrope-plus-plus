const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';

async function fetchAndConvertToBase64(imageUrl) {
  console.log('Fetching image from URL:', imageUrl);
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const chunkSize = 0xffff; // 65535 bytes
    let base64 = '';
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      base64 += String.fromCharCode.apply(null, chunk);
    }
    
    const encodedBase64 = btoa(base64);
    console.log('Successfully converted image to base64');
    return encodedBase64;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw new Error(`Failed to process image: ${error.message}`);
  }
}

export default {
  async fetch(request, env, ctx) {
    
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      if (!env.XAI_API_KEY) {
        throw new Error('XAI_API_KEY environment variable is not set');
      }

      const formData = await request.formData();
      console.log('Received form data:', {
        formDataEntries: Object.fromEntries(formData.entries())
      });

      const imageUrl = formData.get('imageUrl');
      const questions = formData.get('questions'); // Should be JSON string of questions array

      if (!imageUrl || !questions) {
        return new Response(JSON.stringify({
          error: 'Missing required fields: imageUrl and questions'
        }), { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      const questionArray = JSON.parse(questions);
      console.log('Processing questions:', questionArray);

      const base64Image = await fetchAndConvertToBase64(imageUrl);
      
      const apiRequest = {
        model: "grok-vision-beta",
        messages: [
          {
            "role": "system",
            "content": "You are a document analyzer. For each question in the list, determine if it appears on the page. Return ONLY an array of question IDs that are visible in the image, without any additional text or formatting."
          },
          {
            "role": "user",
            "content": [
              {
                "type": "text",
                "text": `Given these questions: ${JSON.stringify(questionArray)}, which question IDs appear on this page? Respond with ONLY an array of strings`
              },
              {
                "type": "image_url",
                "image_url": {
                  "url": `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
      };

      console.log('Sending request to X.AI API...');

      // Make request to X.AI API
      const apiResponse = await fetch(XAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.XAI_API_KEY}`
        },
        body: JSON.stringify(apiRequest)
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error('API error response:', {
          status: apiResponse.status,
          headers: Object.fromEntries(apiResponse.headers.entries()),
          body: errorText
        });
        throw new Error(`API error: ${apiResponse.status} ${errorText}`);
      }

      console.log('Successfully received API response');
      const apiData = await apiResponse.json();
      
      // Extract and parse the question IDs
      if (!apiData.choices?.[0]?.message?.content) {
        console.error('Invalid API response format:', apiData);
        throw new Error('Invalid response format from API');
      }

      let visibleQuestions;
      try {
        const content = apiData.choices[0].message.content.trim();
        console.log('Raw API response content:', content);
        
        // Handle potential markdown formatting
        const jsonContent = content.replace(/```json\n?|\n?```/g, '').trim();
        visibleQuestions = JSON.parse(jsonContent);
        
        if (!Array.isArray(visibleQuestions)) {
          throw new Error('Response is not an array');
        }
        
        console.log('Successfully parsed visible questions:', visibleQuestions);
      } catch (parseError) {
        console.error('Failed to parse API response:', {
          content: apiData.choices[0].message.content,
          error: parseError.message
        });
        throw new Error(`Failed to parse API response: ${parseError.message}`);
      }

      // Return the results
      return new Response(JSON.stringify(visibleQuestions), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST'
        }
      });

    } catch (error) {
      console.error('Error processing request:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      return new Response(JSON.stringify({ 
        error: error.message,
        type: error.name
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST'
        }
      });
    }
  }
};