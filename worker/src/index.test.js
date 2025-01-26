import { describe, expect, it, beforeEach } from 'vitest';
import dotenv from 'dotenv';
dotenv.config();

const WORKER_URL = 'http://localhost:8787';

describe('Gradescope Worker Integration Test', () => {
  // Mock questions data structure
  const mockQuestions = [
    { number: '1', id: 'Problem 1'},
    { number: '2', id: 'Problem 2'},
    { number: '3', id: 'Problem 3'},
    { number: '4', id: 'Problem 4'},
    { number: '5', id: 'Problem 5'},
  ];

  // Get fresh pages from Gradescope since these are stale
  const mockPages = [
      'https://production-gradescope-uploads.s3-us-west-2.amazonaws.com/uploads/page/file/1341907950/page_1.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIAV45MPIOWUTDQQULA%2F20250124%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20250124T225316Z&X-Amz-Expires=10800&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEBYaCXVzLXdlc3QtMiJHMEUCIQDQ4%2FSX4C1Mvl%2FqPAsv%2BcyREND5DIHrgHJCTfTbFbxLIAIgSoQwHFXiEAmldehvF979Su%2Fr4y%2BvHw%2BVbzJyWRqSOT4qugUIHxAAGgw0MDU2OTkyNDkwNjkiDO%2FlwT9NrWuH%2FQYy9SqXBYRn8lo3jSr0moofuOaTYSciNeWW6WMhKPhhx2hfxKYUMtgGx1%2FHO69KlkLTF9wy%2FKTriL5QwSLFODcvx%2FUQfhTMtpp8Fg%2Bx11fDXT1Stj%2FVoKKnrt22ER6DwVsYu79w0sHwa4%2BFq%2BK%2BvV4ttj5TO43vQKNxUt%2BemMy314Z12vPlO%2FhLWGSt9aCrRmySn5SnDs%2Bp5K4sGweOFDpmBYYGrWxNbr4svJ%2Fsjtl5ZqIagIb4FVOe9F%2FnGkRxjfTfvO%2Buo3SQjR%2Fy4lyw6Rv3H6D7XFWOTS08vRjRqSVv%2FksDgva6wrAHTr%2BhXNAh41UnlwWUxfNEQ0%2FFUQ0642XDIo9IT9kP66%2B6Ch7LoJa8BWpy02%2BIL5G1%2FfzrB%2Bg8gQXvckwUwnm2eXvHENGdqFPCyLeY3c0uDTrr%2FQI3o8Xm16ZBBMPHXbv5JCMW%2FG%2Bifhk6TLZRiWgP6Lf6HHs6729eae%2Bg4iGh16b%2BHC3%2FKJeBL9yYH7Vx3%2Fead%2FNusraodHtPJXXSM34E1YALCf%2Flq%2BBwbcHaeVROgg9JJP0IcER2ZhlDr%2BpaT51WFNrfrFqutaF7WTsXGzX537y%2FDu%2BbIg023dDiCnN%2BP3m%2F%2Bb%2Fk%2B3HzTDYiVPk86TlHbpMhhCQi4bp6CjKHy2ua1qY9qSLwKWSz9dixdydZi2NwBM6O%2Byig0c57qAQKEpIYBnZvLcXizJLqQDKXTpywoT98U2u%2Fj81i%2BShNbO0kAbFZ%2B8dnyWhsJ7G6MhpMNHsJGBp5zSes1e7C%2BP%2BqqojyBx8MyZ35ymqipsVoPMz7erWjD4VUzuGSR8Kj%2BQ4x7L74O6DDk%2FFWYfYe0%2FKJFYzGtnp4BgVq8LQVmaTrqKrPBy6IaQxLTEGxI4CChjXkkTCjcqtAvzD5mNC8BjqxAQ5RpP6pKI1KPHmSQx%2BP7QgCGDP9IjCD0L%2FRJU3LDQOJNoy6hf9rdrQnti2AeBsO%2BhPRJW1UhYmt5kmgw5mGJrM7pxQFNfi0zqcrYjQeMvkmt1DJOCTBnRk3EzeEiLKiX2HTxnTwtFugNSeJ5aOs5HF0J8epZhIbsDEQegdY0AdiAwpPD0KnqEYb4UXUcC2DlIGTZQv4hJFLpwOLJLvGWDqbQir8LAC%2Ba7TW%2BB9kS7OJ6A%3D%3D&X-Amz-SignedHeaders=host&X-Amz-Signature=1d76c27347b857a67e9129f79c199d03588a1ef4a7cf59c66ddef8c88ab762fe',
      'https://production-gradescope-uploads.s3-us-west-2.amazonaws.com/uploads/page/file/1341907951/page_2.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIAV45MPIOWUTDQQULA%2F20250124%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20250124T225316Z&X-Amz-Expires=10800&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEBYaCXVzLXdlc3QtMiJHMEUCIQDQ4%2FSX4C1Mvl%2FqPAsv%2BcyREND5DIHrgHJCTfTbFbxLIAIgSoQwHFXiEAmldehvF979Su%2Fr4y%2BvHw%2BVbzJyWRqSOT4qugUIHxAAGgw0MDU2OTkyNDkwNjkiDO%2FlwT9NrWuH%2FQYy9SqXBYRn8lo3jSr0moofuOaTYSciNeWW6WMhKPhhx2hfxKYUMtgGx1%2FHO69KlkLTF9wy%2FKTriL5QwSLFODcvx%2FUQfhTMtpp8Fg%2Bx11fDXT1Stj%2FVoKKnrt22ER6DwVsYu79w0sHwa4%2BFq%2BK%2BvV4ttj5TO43vQKNxUt%2BemMy314Z12vPlO%2FhLWGSt9aCrRmySn5SnDs%2Bp5K4sGweOFDpmBYYGrWxNbr4svJ%2Fsjtl5ZqIagIb4FVOe9F%2FnGkRxjfTfvO%2Buo3SQjR%2Fy4lyw6Rv3H6D7XFWOTS08vRjRqSVv%2FksDgva6wrAHTr%2BhXNAh41UnlwWUxfNEQ0%2FFUQ0642XDIo9IT9kP66%2B6Ch7LoJa8BWpy02%2BIL5G1%2FfzrB%2Bg8gQXvckwUwnm2eXvHENGdqFPCyLeY3c0uDTrr%2FQI3o8Xm16ZBBMPHXbv5JCMW%2FG%2Bifhk6TLZRiWgP6Lf6HHs6729eae%2Bg4iGh16b%2BHC3%2FKJeBL9yYH7Vx3%2Fead%2FNusraodHtPJXXSM34E1YALCf%2Flq%2BBwbcHaeVROgg9JJP0IcER2ZhlDr%2BpaT51WFNrfrFqutaF7WTsXGzX537y%2FDu%2BbIg023dDiCnN%2BP3m%2F%2Bb%2Fk%2B3HzTDYiVPk86TlHbpMhhCQi4bp6CjKHy2ua1qY9qSLwKWSz9dixdydZi2NwBM6O%2Byig0c57qAQKEpIYBnZvLcXizJLqQDKXTpywoT98U2u%2Fj81i%2BShNbO0kAbFZ%2B8dnyWhsJ7G6MhpMNHsJGBp5zSes1e7C%2BP%2BqqojyBx8MyZ35ymqipsVoPMz7erWjD4VUzuGSR8Kj%2BQ4x7L74O6DDk%2FFWYfYe0%2FKJFYzGtnp4BgVq8LQVmaTrqKrPBy6IaQxLTEGxI4CChjXkkTCjcqtAvzD5mNC8BjqxAQ5RpP6pKI1KPHmSQx%2BP7QgCGDP9IjCD0L%2FRJU3LDQOJNoy6hf9rdrQnti2AeBsO%2BhPRJW1UhYmt5kmgw5mGJrM7pxQFNfi0zqcrYjQeMvkmt1DJOCTBnRk3EzeEiLKiX2HTxnTwtFugNSeJ5aOs5HF0J8epZhIbsDEQegdY0AdiAwpPD0KnqEYb4UXUcC2DlIGTZQv4hJFLpwOLJLvGWDqbQir8LAC%2Ba7TW%2BB9kS7OJ6A%3D%3D&X-Amz-SignedHeaders=host&X-Amz-Signature=5f2112cdc04b85a4797690e8ca4b60953a2072c400cf2b577b774b3c55535d98'
  ];

  it('processes a single page and returns visible questions', async () => {
    const formData = new FormData();
    formData.append('imageUrls', JSON.stringify(mockPages));
    formData.append('questions', JSON.stringify(mockQuestions));

    const response = await fetch(WORKER_URL, {
      method: 'POST',
      body: formData,
    });

    console.log('Response status:', response.status);
    expect(response.status).toBe(200);

    const result = await response.json();
    console.log('Result:', JSON.stringify(result));

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
}, 10000);