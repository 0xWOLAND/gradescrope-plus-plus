import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import OpenAI from 'openai';

// Define the schema for image analysis results
const ImageAnalysis = z.object({
  imageId: z.string(),
  questions: z.array(z.string()),
});

const AnalysisResponse = z.object({
  images: z.array(ImageAnalysis)
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
                text: `Given these pages, identify the IDs of the questions that appear in each page from the following list of questions: ${JSON.stringify(questionArray)}.` 
              },
            ]
        }
      ];

      console.log('Sending request to OpenAI API...');

      const response = await openai.beta.chat.completions.parse({
        model: "gpt-4o",
        messages,
        response_format: zodResponseFormat(AnalysisResponse, 'analysis')
      })

      const analysis = await response.choices[0].message.parsed;
      console.log('Successfully parsed analysis:', JSON.stringify(analysis));

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