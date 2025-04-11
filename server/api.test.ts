import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import { registerRoutes } from './routes';
import { storage } from './storage';
import { SystemSettings, User } from '@shared/schema';

// Mock the storage module
vi.mock('./storage', () => {
  return {
    storage: {
      getSystemSettings: vi.fn(),
      updateSystemSettings: vi.fn(),
      getUser: vi.fn(),
      getUserByUsername: vi.fn(),
      createUser: vi.fn(),
      sessionStore: {
        // Mock methods needed for session store
      }
    }
  };
});

// Mock the authentication check for routes that require it
vi.mock('./auth', () => {
  return {
    setupAuth: vi.fn().mockImplementation((app: Express) => {
      // Add a mock middleware for isAuthenticated
      app.use((req: any, _res, next) => {
        req.isAuthenticated = () => true;
        req.user = {
          id: 1,
          username: 'testuser',
          role: 'admin'
        };
        next();
      });
    })
  };
});

describe('API Routes', () => {
  let app: Express;
  
  // Set up a fresh Express app before each test
  beforeEach(async () => {
    app = express();
    app.use(express.json());
    await registerRoutes(app);
  });
  
  // Clear all mocks after each test
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('GET /api/system-settings', () => {
    it('should return system settings', async () => {
      const mockSettings: Partial<SystemSettings> = {
        id: 1,
        loginSplashTitle: 'Welcome to myAssetPlace',
        loginSplashText: 'Your complete financial management platform',
        loginSplashImageUrl: 'https://example.com/image.jpg'
      };
      
      // Mock the getSystemSettings implementation
      vi.mocked(storage.getSystemSettings).mockResolvedValue(mockSettings as SystemSettings);
      
      const response = await request(app).get('/api/system-settings');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSettings);
      expect(storage.getSystemSettings).toHaveBeenCalledTimes(1);
    });
    
    it('should handle errors properly', async () => {
      // Mock a failure in getSystemSettings
      vi.mocked(storage.getSystemSettings).mockRejectedValue(new Error('Database error'));
      
      const response = await request(app).get('/api/system-settings');
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Failed to fetch system settings');
    });
  });
  
  describe('PUT /api/system-settings', () => {
    it('should update system settings', async () => {
      const updatedSettings: Partial<SystemSettings> = {
        loginSplashTitle: 'New Title',
        loginSplashText: 'New welcome text',
        loginSplashImageUrl: 'https://example.com/new-image.jpg'
      };
      
      const mockResult: Partial<SystemSettings> = {
        id: 1,
        ...updatedSettings
      };
      
      // Mock the updateSystemSettings implementation
      vi.mocked(storage.updateSystemSettings).mockResolvedValue(mockResult as SystemSettings);
      
      const response = await request(app)
        .put('/api/system-settings')
        .send(updatedSettings);
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(storage.updateSystemSettings).toHaveBeenCalledWith(updatedSettings);
    });
    
    it('should reject invalid data', async () => {
      const invalidSettings = {
        loginSplashTitle: '', // Too short
        loginSplashText: 'Valid text',
      };
      
      const response = await request(app)
        .put('/api/system-settings')
        .send(invalidSettings);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(storage.updateSystemSettings).not.toHaveBeenCalled();
    });
  });
});