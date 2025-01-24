import { describe, expect, it, beforeEach } from 'vitest';
import dotenv from 'dotenv';
dotenv.config();

const WORKER_URL = 'http://localhost:8787';

describe('Gradescope Worker Integration Test', () => {
  // Mock questions data structure
  const mockQuestions = [
    { number: '1', id: '2.1'},
    { number: '2', id: '2.2'},
    { number: '3', id: '2.3'},
    { number: '4', id: '2.4'},
    { number: '5', id: '2.5'},
  ];

  // Get fresh pages from Gradescope since these are stale
  const mockPages = [
      'https://production-gradescope-uploads.s3-us-west-2.amazonaws.com/uploads/page/file/1341853865/page_1.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIAV45MPIOW5PFXNO2L%2F20250124%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20250124T182710Z&X-Amz-Expires=10800&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEBEaCXVzLXdlc3QtMiJHMEUCIDkoM%2B2b0d7wXIuGNG4Lnk7G5HS5hPm0NifnyembvCH9AiEA0j9qUiW1rZB3iNlu%2FUG5%2FmWa60dc2WqGrTF7mIYMUswquQUIGhAAGgw0MDU2OTkyNDkwNjkiDIWmZ43ez6wGJgGRoCqWBc%2BMoH6AjCp%2FZBU880jDjGK5xyyx4EwiedyMRnaVMgLwyuaCrbp5mzW7jWqE4%2Ba9WGLD%2BVNL3VNE2ORq3uPcYcgXyOT%2Fz259%2FB%2FW%2B%2Be8YgxvPkFygfyYtVGWE7gpJWfOq9mR3uQbiuLTkoHXxuSPQG0M34UI6ZdVFNVIncu6zbXMtk2TIDpKDaXIYcSn1nqyoXdHTVhguIOobEaKo4c%2FBBP7VCBhf2lUOrge6l0oOlKUCay2m9ChWRFXI2Uzyi8RBo7dXUrTfrffIZLojaOy5PiXm99vubzgYkra1k4ZKYZomkjtWgd4n6QDH4RhHHwVTb4lEdb6rQQ8wbkEKHO3aK%2BPe7pznxMKPJ7uAQVb18GCiDv172rGWCe5tBvLpXDFCgy9r1PNUSnw1%2Bsa6oCUEx8kG93Jw2hokEBtL6NF8%2F%2F8c%2Bv5XKW9w1t5Cl3xPhL1UAgMNfcB0YT6kR5HGkTzCVin3yYSLVXb8AzY2dX%2BmwvsA9cY%2BozC%2BMkrDCJAaqTYseaL7ftxcfxO58xYG4v7Y63q%2B9OeAmlxp9QW9pHhqsAFPPe03PaxemStfM6x%2Bh8Q%2Fseqqwa%2FJJC6XZO4WSCqwJXJMQ9VVDuLRysk9Is7OVmtzQp%2BYxoQlTr4eoblQ7CaU91Q9iSjv6R5x4AoXnN3VpHDiSUkOOefS5VC5k6OotSwtTBKpNduOuMtzlg0icK5g8SC0HktYpUltcDIMpLcfLqh%2BGrSXQjjU62PTHSkmSZl1V2kdXoyMuoHlGPe3itbVPLXlaq431e0Fx3D6QeKrPNt96pUmD6mAP5RXoyXTrzsK6WXMHM8UQqzudVKJvgFo88n%2Fw0XIFIo31e%2BNV36K5yQch99hlc5PibytoIEDyO%2Fn4henILbMOuHz7wGOrEBZ3ybdvCUNdQIZRqOlhdpEv6eGg%2FqhTvfRqkX8rpafEMvkOQPvSRDVHoTOnd8tZDTtHyBjf%2Bf1fK%2Fb4eWfjez5TNgpbeKizL6g5GoySsOuTOczQTIfrtN4NMJOY%2FYVYyXen3i3ikcLpPVvx6CQawc063k7qkdKQTOGPAhPf21HTSrXyU4qemfLmXIZGLvBwpHMYrLM0HufQ9LUx%2FeOrM3OXU%2BabmIo3aLAnXmElg%2BPmLT&X-Amz-SignedHeaders=host&X-Amz-Signature=e7eaac695c44c78eaf42aa562c9003650970c90821b00d9204bff4cac1bf51ae',
      'https://production-gradescope-uploads.s3-us-west-2.amazonaws.com/uploads/page/file/1341853866/page_2.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIAV45MPIOW5PFXNO2L%2F20250124%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20250124T182710Z&X-Amz-Expires=10800&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEBEaCXVzLXdlc3QtMiJHMEUCIDkoM%2B2b0d7wXIuGNG4Lnk7G5HS5hPm0NifnyembvCH9AiEA0j9qUiW1rZB3iNlu%2FUG5%2FmWa60dc2WqGrTF7mIYMUswquQUIGhAAGgw0MDU2OTkyNDkwNjkiDIWmZ43ez6wGJgGRoCqWBc%2BMoH6AjCp%2FZBU880jDjGK5xyyx4EwiedyMRnaVMgLwyuaCrbp5mzW7jWqE4%2Ba9WGLD%2BVNL3VNE2ORq3uPcYcgXyOT%2Fz259%2FB%2FW%2B%2Be8YgxvPkFygfyYtVGWE7gpJWfOq9mR3uQbiuLTkoHXxuSPQG0M34UI6ZdVFNVIncu6zbXMtk2TIDpKDaXIYcSn1nqyoXdHTVhguIOobEaKo4c%2FBBP7VCBhf2lUOrge6l0oOlKUCay2m9ChWRFXI2Uzyi8RBo7dXUrTfrffIZLojaOy5PiXm99vubzgYkra1k4ZKYZomkjtWgd4n6QDH4RhHHwVTb4lEdb6rQQ8wbkEKHO3aK%2BPe7pznxMKPJ7uAQVb18GCiDv172rGWCe5tBvLpXDFCgy9r1PNUSnw1%2Bsa6oCUEx8kG93Jw2hokEBtL6NF8%2F%2F8c%2Bv5XKW9w1t5Cl3xPhL1UAgMNfcB0YT6kR5HGkTzCVin3yYSLVXb8AzY2dX%2BmwvsA9cY%2BozC%2BMkrDCJAaqTYseaL7ftxcfxO58xYG4v7Y63q%2B9OeAmlxp9QW9pHhqsAFPPe03PaxemStfM6x%2Bh8Q%2Fseqqwa%2FJJC6XZO4WSCqwJXJMQ9VVDuLRysk9Is7OVmtzQp%2BYxoQlTr4eoblQ7CaU91Q9iSjv6R5x4AoXnN3VpHDiSUkOOefS5VC5k6OotSwtTBKpNduOuMtzlg0icK5g8SC0HktYpUltcDIMpLcfLqh%2BGrSXQjjU62PTHSkmSZl1V2kdXoyMuoHlGPe3itbVPLXlaq431e0Fx3D6QeKrPNt96pUmD6mAP5RXoyXTrzsK6WXMHM8UQqzudVKJvgFo88n%2Fw0XIFIo31e%2BNV36K5yQch99hlc5PibytoIEDyO%2Fn4henILbMOuHz7wGOrEBZ3ybdvCUNdQIZRqOlhdpEv6eGg%2FqhTvfRqkX8rpafEMvkOQPvSRDVHoTOnd8tZDTtHyBjf%2Bf1fK%2Fb4eWfjez5TNgpbeKizL6g5GoySsOuTOczQTIfrtN4NMJOY%2FYVYyXen3i3ikcLpPVvx6CQawc063k7qkdKQTOGPAhPf21HTSrXyU4qemfLmXIZGLvBwpHMYrLM0HufQ9LUx%2FeOrM3OXU%2BabmIo3aLAnXmElg%2BPmLT&X-Amz-SignedHeaders=host&X-Amz-Signature=62aad962e45f3b912995598e6f36b0b571feb5a90828a93e3d2420a47f3181a3'
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