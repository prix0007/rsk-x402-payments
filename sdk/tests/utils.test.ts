import { ethers } from 'ethers';
import {
  formatUSDRIF,
  parseUSDRIF,
  isValidAddress,
  getCurrentTimestamp,
  isExpired,
  parseError,
  validateServiceParams,
  retry
} from '../src/utils';

describe('Utils', () => {
  describe('formatUSDRIF', () => {
    it('should format USDRIF amount correctly', () => {
      const amount = ethers.utils.parseEther('1.5');
      expect(formatUSDRIF(amount)).toBe('1.5');
    });

    it('should handle zero amount', () => {
      const amount = ethers.BigNumber.from('0');
      expect(formatUSDRIF(amount)).toBe('0.0');
    });

    it('should handle small amounts', () => {
      const amount = ethers.utils.parseUnits('0.001', 18);
      expect(formatUSDRIF(amount)).toBe('0.001');
    });
  });

  describe('parseUSDRIF', () => {
    it('should parse USDRIF string correctly', () => {
      const result = parseUSDRIF('1.5');
      expect(result.toString()).toBe(ethers.utils.parseEther('1.5').toString());
    });

    it('should handle zero amount', () => {
      const result = parseUSDRIF('0');
      expect(result.toString()).toBe('0');
    });

    it('should handle decimal amounts', () => {
      const result = parseUSDRIF('0.001');
      expect(result.toString()).toBe(ethers.utils.parseUnits('0.001', 18).toString());
    });
  });

  describe('isValidAddress', () => {
    it('should validate correct addresses', () => {
      const validAddress = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
      const anotherValidAddress = '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359';
      expect(isValidAddress(validAddress)).toBe(true);
      expect(isValidAddress(anotherValidAddress)).toBe(true);
    });

    it('should reject invalid addresses', () => {
      const invalidAddresses = [
        '0x123',
        '742d35CS6634C0532925a3b8D42c2D2bb56b7b8c',
        '0x',
        '',
        'not-an-address'
      ];

      invalidAddresses.forEach(address => {
        expect(isValidAddress(address)).toBe(false);
      });
    });
  });

  describe('getCurrentTimestamp', () => {
    it('should return current timestamp in seconds', () => {
      const now = Math.floor(Date.now() / 1000);
      const timestamp = getCurrentTimestamp();

      expect(timestamp).toBeGreaterThanOrEqual(now - 1);
      expect(timestamp).toBeLessThanOrEqual(now + 1);
    });
  });

  describe('isExpired', () => {
    it('should detect expired timestamps', () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 7200; // 2 hours ago
      const validityDuration = 3600; // 1 hour

      expect(isExpired(pastTimestamp, validityDuration)).toBe(true);
    });

    it('should detect valid timestamps', () => {
      const recentTimestamp = Math.floor(Date.now() / 1000) - 1800; // 30 minutes ago
      const validityDuration = 3600; // 1 hour

      expect(isExpired(recentTimestamp, validityDuration)).toBe(false);
    });
  });

  describe('parseError', () => {
    it('should extract reason from error', () => {
      const error = { reason: 'Insufficient funds' };
      expect(parseError(error)).toBe('Insufficient funds');
    });

    it('should handle unknown errors', () => {
      const error = { message: 'Some unknown error' };
      expect(parseError(error)).toBe('Some unknown error');
    });

    it('should handle errors without message', () => {
      const error = {};
      expect(parseError(error)).toBe('Unknown error occurred');
    });
  });

  describe('validateServiceParams', () => {
    const validParams = {
      name: 'Test Service',
      description: 'Test Description',
      price: ethers.utils.parseEther('0.1'),
      validityDuration: 3600,
      endpoints: ['/api/test'],
    };

    it('should validate correct parameters', () => {
      expect(() => validateServiceParams(validParams)).not.toThrow();
    });

    it('should reject empty name', () => {
      const params = { ...validParams, name: '' };
      expect(() => validateServiceParams(params)).toThrow('Service name is required');
    });

    it('should reject zero price', () => {
      const params = { ...validParams, price: ethers.BigNumber.from('0') };
      expect(() => validateServiceParams(params)).toThrow('Service price must be greater than 0');
    });
  });

  describe('retry', () => {
    it('should succeed on first try', async () => {
      const successFn = jest.fn().mockResolvedValue('success');

      const result = await retry(successFn, 3, 100);

      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const failThenSucceedFn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');

      const result = await retry(failThenSucceedFn, 3, 10);

      expect(result).toBe('success');
      expect(failThenSucceedFn).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      const alwaysFailFn = jest.fn().mockRejectedValue(new Error('Always fails'));

      await expect(retry(alwaysFailFn, 2, 10)).rejects.toThrow('Always fails');
      expect(alwaysFailFn).toHaveBeenCalledTimes(2);
    });
  });
});
