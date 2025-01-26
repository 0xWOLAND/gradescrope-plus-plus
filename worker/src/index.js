import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import OpenAI from 'openai';

const QuestionPageMapping = z.object({
  questionId: z.string(),
  startPage: z.number(),
  endPage: z.number()
});

const MappingResponse = z.object({
  mappings: z.array(QuestionPageMapping)
});

async function fetchAndConvertToBase64(imageUrl) {
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
    return encodedBase64;
  } catch (error) {
    throw new Error(`Failed to process image: ${error.message}`);
  }
}

async function processImages(imageUrls) {
  const processedImages = await Promise.all(
    imageUrls.map(async (url) => {
      const base64 = await fetchAndConvertToBase64(url);
      return {
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${base64}`
        }
      };
    })
  );
  return processedImages;
}

function convertMappingsToAnalysis(mappingResponse, totalPages) {
  // Initialize the result array with the correct schema
  const images = Array.from({ length: totalPages }, (_, index) => ({
    imageId: `page${index + 1}`,
    questions: []
  }));

  // Ensure mappings exists and is an array
  const mappings = Array.isArray(mappingResponse?.mappings) ? mappingResponse.mappings : [];
  
  // For each question mapping, add the question to all pages in its range
  mappings.forEach(mapping => {
    if (mapping && typeof mapping.startPage === 'number' && typeof mapping.endPage === 'number' && mapping.questionId) {
      for (let page = mapping.startPage; page <= mapping.endPage; page++) {
        if (page > 0 && page <= totalPages) {
          images[page - 1].questions.push(mapping.questionId);
        }
      }
    }
  });

  return { images };
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
      if (!env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
      }

      const openai = new OpenAI({
        apiKey: env.OPENAI_API_KEY
      });

      const formData = await request.formData();
      console.log('Received form data:', {
        formDataEntries: Object.fromEntries(formData.entries())
      });

      const imageUrls = JSON.parse(formData.get('imageUrls') || '[]');
      const questions = formData.get('questions'); // JSON string of questions array

      if (!imageUrls.length || !questions) {
        return new Response(JSON.stringify({
          error: 'Missing required fields: imageUrls and questions'
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

      // Process all images in parallel
      const processedImages = await processImages(imageUrls);
      
      // Build the content array with image IDs
      const content = [];
      processedImages.forEach((image, index) => {
        content.push({ 
          type: 'text', 
          text: `This is page ${index + 1}:` 
        });
        content.push(image);
      });

      const messages = [
        {
          role: "user",
          content: [
            ...content,
            {
              type: "text",
              text: `Given these pages, for each question in the following list, identify the page number where the question BEGINS and where it ENDS. Each subsequent page should be associated with that question until the start of the next question is found. Here are the questions: ${JSON.stringify(questionArray)}. 
              
              Return the results as an array of mappings, where each mapping contains:
              - questionId: the question text
              - startPage: the page number where this question begins
              - endPage: the page number where this question ends (either where the next question begins - 1, or the last page if it's the final question)`
            },
          ]
        }
      ];

      console.log('Sending request to OpenAI API...');

      // First get the page mappings
      const mappingResponse = await openai.beta.chat.completions.parse({
        model: "gpt-4o",
        messages,
        response_format: zodResponseFormat(MappingResponse, 'mappings')
      });

      const mappings = mappingResponse.choices[0].message.parsed;
      const analysis = convertMappingsToAnalysis(mappings, imageUrls.length);

      return new Response(JSON.stringify(analysis), {
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