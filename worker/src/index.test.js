import { describe, expect, it, beforeEach } from 'vitest';
import dotenv from 'dotenv';
dotenv.config();

// const WORKER_URL = 'https://gradescope-grok-worker.bhargav-annem.workers.dev';
const WORKER_URL = 'http://localhost:8787';

describe('Gradescope Worker Integration Test', () => {
  // Mock questions data structure
  const mockQuestions = [
    { number: '1', id: '2.1', points: '1.0 pt' },
    { number: '2', id: '2.2', points: '1.0 pt' },
    { number: '3', id: '2.3', points: '1.0 pt' },
    { number: '4', id: '2.4', points: '1.0 pt' },
    { number: '5', id: '2.5', points: '1.0 pt' },
  ];

  // Mock pages data structure with full URLs
  const mockPages = [
    {
      number: '1',
      imageUrl: "https://production-gradescope-uploads.s3-us-west-2.amazonaws.com/uploads/page/file/1341853865/page_1.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIAV45MPIOW4EWZDQ3R%2F20250124%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20250124T065542Z&X-Amz-Expires=10800&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEAYaCXVzLXdlc3QtMiJHMEUCIQDp8aqIylUWnCqbFyeITt%2BgEpaGGnTkokNGMtGt4RmtXAIgfh3IJ67P8Fw5jgXFCQE08WYL9MjxF3xrIi0jAREWZW8qxAUI%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw0MDU2OTkyNDkwNjkiDFd0MVurJSwsoWNuMiqYBWy6JiyEYcW5AXsNrGpcc7CHFt6aCMbYXBztPCku1xkaK69%2FAmOwPmWCySBvflIu%2FvJIcEXuj%2BFFZ%2FQ%2BHAsIukU9fHNYyVAFvpPwMMxOtPg4cWDDA6yzbjlXvK8qZSw8zQbF1fW02YoPSPhzwcmU2P8zDLqhMEr47eIW9Ake8zeepW2jsLvWeiPTTG%2BWFHqC%2B5XCRD8B8T1iwfvowj2vBa8cwu3XvrAOz%2BsfQXCygIM0GSW2Mp2gGLDQmSgh3BoBOardZPMkGFmN%2B0FVfzjrE%2BtgMS36sDl%2BfInRD%2BkGw8WW3DBn7SF5%2FgiJ5ri06ApqbflmacfsJrJ%2B0SvgjnJAnRfG1ygxdznDxWrMEqCo9EAciiWsLN0%2BuUBuvoR8N%2FIBKDm1kIoIDWQ0YGW%2BlmlvIX%2F0c1%2BlROSALREpbpwxu6%2Fi5vvicS0SbcDYOu%2BGtnqTBmiM%2B4jsduxDXQZyFcH7UikzluPgiWktid38sIMNPvuzkA9S3gGwBNbxW3aZJpU7JuHC%2F4ZiU3CRxAdUfns0ij5RvUqp4REGHg5gXPCG7hhbdt0p5AZCp%2BmmV134zhmqES0EM58H3yhMLuUttfyFyu5AAIhMWaZaGpz0BgRKFgaaC0D51eyDucQec6%2BjxuhCLJ8A9rBfHFkazT44Fz2dYxaU61Ouw9NYrrZecdZqCPOGE65bb8THacR5RJ1PIf0NdHZQW2aBNnFrwteE6vHV7kcRwCB6TsS4khPQptWVR%2Fsg955w0r%2FZZKTxyvKiaRNV8PQwI8fcVru6rgp035AIQoRj9RBtdn1Sf%2FjW9afXsy7JM9gtF4S%2B5QwkGD%2FEQ9D2M%2BfKVlCrq5iY7oBZlWFYgEyG0vo97EUMlRKMl4H%2BT14nlMskg5hMC7YwuNzMvAY6sQEQxXk6vBshD%2BowfnlccJuetfO2wAoB%2Feq8BshQa0fwpIrJBV8lIRV8uyUza%2B9UZXEDoaZTEPybDLbbEQl5%2FfbEDjUoWwcAIWFqm4LIPGa%2BA8sqa5xMmYbm02T39LKs2I1T6Prr0QllLGw5THNgUhw9ciLjmVQSLz%2FVb14tfIyZ7%2Fa23L3YVoZrmrFskkeGRjA%2FY2nwIM9W%2FLLgSExyssETMeRBaTZxorG%2F5Pmjl8yzGJs%3D&X-Amz-SignedHeaders=host&X-Amz-Signature=e263dd5cf6cd5c30e6c2cd27c89084c637709c119e16d6c4f2591f68f2043812",
    },
  ];

  it('processes a single page and returns visible questions', async () => {
    const formData = new FormData();
    formData.append('imageUrl', mockPages[0].imageUrl);
    formData.append('questions', JSON.stringify(mockQuestions));

    const response = await fetch(WORKER_URL, {
      method: 'POST',
      body: formData,
    });

    console.log('Response status:', response.status);
    expect(response.status).toBe(200);

    const result = await response.json();
    console.log('Result:', result);

    // Verify the response is an array
    expect(Array.isArray(result)).toBe(true);

    // Verify each returned ID is valid
    result.forEach(questionId => {
      expect(mockQuestions.some(q => q.id === questionId)).toBe(true);
    });

    // Verify the results contain proper question IDs
    result.forEach(questionId => {
      expect(typeof questionId).toBe('string');
      expect(questionId).toMatch(/^\d+\.\d+$/); // Matches format like "2.1"
    });
  });
});