import {
  getAcceptanceToken,
  tokenizeCard,
  createTransaction,
  getTransactionStatus,
} from './wompiAPI';

// Mock setTimeout to make tests run faster
jest.useFakeTimers();

describe('wompiAPI', () => {
  describe('getAcceptanceToken', () => {
    it('should return a mock acceptance token', async () => {
      const publicKey = 'test_pk_123';
      const promise = getAcceptanceToken(publicKey);
      jest.runAllTimers(); // Resolve setTimeout
      const token = await promise;
      expect(token).toBe('mock_acceptance_token_123');
    });
  });

  describe('tokenizeCard', () => {
    it('should return a mock card token', async () => {
      const acceptanceToken = 'test_at_456';
      const cardData = {
        number: '1234567890123456',
        cvc: '123',
        exp_month: '01',
        exp_year: '2025',
        card_holder: 'Test User',
      };
      const promise = tokenizeCard(acceptanceToken, cardData);
      jest.runAllTimers();
      const token = await promise;
      expect(token).toBe('mock_card_token_for_3456');
    });
  });

  describe('createTransaction', () => {
    it('should return a mock transaction response', async () => {
      const acceptanceToken = 'test_at_789';
      const cardToken = 'card_tok_abc';
      const transactionData = {
        amount_in_cents: 10000,
        currency: 'USD',
        customer_email: 'test@example.com',
        reference: 'test_ref_001',
      };
      const promise = createTransaction(acceptanceToken, cardToken, transactionData);
      jest.runAllTimers();
      const response = await promise;

      expect(response).toHaveProperty('id');
      expect(response.id).toMatch(/^mock_transaction_id_\d+$/);
      expect(response).toHaveProperty('status', 'PENDING');
      expect(response).toHaveProperty('redirectUrl');
      expect(response.redirectUrl).toContain(response.id);
      expect(response.amount_in_cents).toBe(10000);
    });
  });

  describe('getTransactionStatus', () => {
    it('should return a mock transaction status', async () => {
      const transactionId = 'mock_tid_xyz';
      const promise = getTransactionStatus(transactionId);
      jest.runAllTimers();
      const response = await promise;

      expect(response).toHaveProperty('id', transactionId);
      expect(response).toHaveProperty('status');
      expect(['APPROVED', 'DECLINED', 'ERROR']).toContain(response.status);
    });

    it('should eventually return APPROVED (statistically)', async () => {
      // This test is statistical due to Math.random, might be flaky but tests the distribution
      let approved = false;
      for (let i = 0; i < 20; i++) { // Run a few times to increase chance of hitting APPROVED
        const promise = getTransactionStatus('test_id_approve');
        jest.runAllTimers();
        const response = await promise;
        if (response.status === 'APPROVED') {
          approved = true;
          break;
        }
      }
      expect(approved).toBe(true);
    });

    it('should eventually return DECLINED (statistically)', async () => {
        let declined = false;
        // Seed Math.random for predictable outcomes if needed, or increase attempts
        // For this example, we rely on enough attempts.
        for (let i = 0; i < 30; i++) {
            // Mock Math.random to control the outcome for this specific test case
            const mockMath = Object.create(global.Math);
            mockMath.random = () => 0.8; // Will result in DECLINED (0.7 <= x < 0.9)
            global.Math = mockMath;

            const promise = getTransactionStatus('test_id_decline');
            jest.runAllTimers();
            const response = await promise;
            if (response.status === 'DECLINED') {
                declined = true;
                break;
            }
            global.Math = Object.getPrototypeOf(mockMath); // Restore original Math
        }
        expect(declined).toBe(true);
    });
  });
});

// Restore original timers
jest.useRealTimers();
