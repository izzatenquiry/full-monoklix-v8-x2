// Note: This file is for testing demonstration purposes and requires a test environment like Jest to run.

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const mockSignUp = jest.fn();
const mockInsert = jest.fn();
const mockSingle = jest.fn();
const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
const mockSignInWithOtp = jest.fn();

const mockFrom = jest.fn().mockReturnValue({
  insert: mockInsert,
  select: mockSelect,
});

jest.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: mockSignUp,
      signInWithOtp: mockSignInWithOtp,
    },
    from: mockFrom,
  },
}));

import {
  loginUser,
} from './userService';

describe('userService with Supabase', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('loginUser', () => {
    it('should return a user object if the user exists', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        phone: '12345',
        role: 'user',
        status: 'lifetime',
        api_key: null,
        avatar_url: null,
        subscription_expiry: null,
        webhook_url: null,
      };
      // FIX: Cast to 'any' to bypass incorrect type inference from simplified mock.
      (mockSingle as jest.Mock).mockResolvedValueOnce({ data: mockProfile, error: null } as any);

      const result = await loginUser('test@example.com');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user).toBeDefined();
        expect(result.user.email).toBe('test@example.com');
      }
    });

    it('should fail to log in if user is not found', async () => {
      // FIX: Cast to 'any' to bypass incorrect type inference from simplified mock.
      (mockSingle as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'user not found' },
      } as any);

      const result = await loginUser('test@example.com');

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.message).toBe('This email is not registered. Please complete payment at our main website to gain access.');
      }
    });
  });
});