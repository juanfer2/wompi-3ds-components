import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import Wompi3DS from './Wompi3DS';
import * as wompiAPI from '../../services/wompiAPI';

// Mock the wompiAPI module
jest.mock('../../services/wompiAPI');

const mockGetAcceptanceToken = wompiAPI.getAcceptanceToken as jest.Mock;
const mockTokenizeCard = wompiAPI.tokenizeCard as jest.Mock;
const mockCreateTransaction = wompiAPI.createTransaction as jest.Mock;
const mockGetTransactionStatus = wompiAPI.getTransactionStatus as jest.Mock;

const baseProps = {
  publicKey: 'pub_test_mock_key',
  amountInCents: 10000,
  currency: 'COP',
  customerEmail: 'test@example.com',
  reference: 'test_ref_123',
  onSuccess: jest.fn(),
  onError: jest.fn(),
  cardData: {
    number: '4242424242424242',
    cvc: '123',
    exp_month: '12',
    exp_year: '2030',
    card_holder: 'Test User',
  },
};

describe('Wompi3DS Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Default mock implementations (can be overridden in specific tests)
    mockGetAcceptanceToken.mockResolvedValue('mock_acceptance_token');
    mockTokenizeCard.mockResolvedValue('mock_card_token');
    mockCreateTransaction.mockResolvedValue({
      id: 'mock_transaction_id_initial',
      status: 'PENDING', // Default to PENDING for many tests
      redirectUrl: 'https://mock-3ds-server.com/challenge?transactionId=mock_transaction_id_initial',
    });
    mockGetTransactionStatus.mockResolvedValue({
      id: 'mock_transaction_id_initial',
      status: 'APPROVED', // Default to APPROVED after polling
    });
  });

  test('Basic Rendering: displays initial loading state and calls getAcceptanceToken', async () => {
    render(<Wompi3DS {...baseProps} />);

    // The component initializes and starts the flow immediately.
    // It should show "gettingAcceptanceToken" first.
    expect(screen.getByText('Status:', { exact: false })).toHaveTextContent('Status: gettingAcceptanceToken');

    await waitFor(() => {
      expect(mockGetAcceptanceToken).toHaveBeenCalledWith(baseProps.publicKey);
    });
  });

  test('Successful Flow (no_challenge): progresses through steps and calls onSuccess', async () => {
    // Override createTransaction for this specific test if needed,
    // but default mock should work if it leads to polling then APPROVED.
    // Ensure getTransactionStatus will return APPROVED
    mockGetTransactionStatus.mockResolvedValueOnce({
      id: 'mock_tx_no_challenge', status: 'APPROVED'
    });

    mockCreateTransaction.mockResolvedValueOnce({
      id: 'mock_tx_no_challenge',
      status: 'APPROVED', // Simulate immediate approval for no_challenge
      // No redirectUrl or specific 3DS fields needed if Wompi approves directly
    });


    render(<Wompi3DS {...baseProps} threeDsAuthType="no_challenge" />);

    await waitFor(() => {
      expect(mockGetAcceptanceToken).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockTokenizeCard).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockCreateTransaction).toHaveBeenCalledTimes(1);
      expect(mockCreateTransaction).toHaveBeenCalledWith(
        'mock_acceptance_token',
        'mock_card_token',
        expect.objectContaining({
          is_three_ds: true,
          three_ds_auth_type: 'no_challenge',
        })
      );
    });

    // If createTransaction directly returns APPROVED for "no_challenge"
    await waitFor(() => {
      expect(baseProps.onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mock_tx_no_challenge',
          status: 'APPROVED',
        })
      );
    });

    expect(screen.getByText('Status:', { exact: false })).toHaveTextContent('Status: completed');
    expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
    expect(screen.getByText('Transaction ID: mock_tx_no_challenge')).toBeInTheDocument();

    // Polling should not happen if transaction is approved directly
    // However, our component logic for 'no_challenge' currently might go to 'pollingStatus'
    // if initialTransaction.status is not 'APPROVED' immediately.
    // Let's adjust the mock for createTransaction to return PENDING initially,
    // then getTransactionStatus to return APPROVED for 'no_challenge' flow.

    // Reset and re-run with more precise mocks for no_challenge involving polling
    jest.clearAllMocks();
    mockGetAcceptanceToken.mockResolvedValue('mock_acceptance_token_nc');
    mockTokenizeCard.mockResolvedValue('mock_card_token_nc');
    mockCreateTransaction.mockResolvedValueOnce({
      id: 'mock_tx_no_challenge_poll',
      status: 'PENDING', // Assume it needs polling even for no_challenge
      // redirectUrl: null, // Explicitly no redirect for no_challenge
    });
    mockGetTransactionStatus.mockResolvedValueOnce({
      id: 'mock_tx_no_challenge_poll',
      status: 'APPROVED',
    });
    const newOnSuccess = jest.fn();
    const newOnError = jest.fn();

    render(
      <Wompi3DS
        {...baseProps}
        onSuccess={newOnSuccess}
        onError={newOnError}
        reference="no_challenge_poll_ref"
        threeDsAuthType="no_challenge"
      />
    );

    await waitFor(() => {
        expect(screen.getByText('Status:', { exact: false })).toHaveTextContent('Status: pollingStatus');
    }, { timeout: 2000 }); // useEffect has timeouts

    await waitFor(() => {
      expect(mockGetTransactionStatus).toHaveBeenCalledWith('mock_tx_no_challenge_poll');
    }, { timeout: 6000 }); // Polling interval + processing

    await waitFor(() => {
      expect(newOnSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mock_tx_no_challenge_poll',
          status: 'APPROVED',
        })
      );
      expect(screen.getByText('Status:', { exact: false })).toHaveTextContent('Status: completed');
      expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
    }, { timeout: 1000 });


  });


  test('Challenge Flow (threeDsAuthType="challenge"): renders iframe and then completes', async () => {
    // jest.useFakeTimers();
    mockCreateTransaction.mockResolvedValueOnce({
      id: 'mock_tx_challenge',
      status: 'PENDING',
      redirectUrl: 'https://mock-3ds-server.com/challengeframe?id=mock_tx_challenge',
      // Wompi might also send three_ds_method_data with iframeHTML directly
    });
    // First status check during polling might still be PENDING (after iframe "interaction")
    mockGetTransactionStatus
      .mockResolvedValueOnce({ id: 'mock_tx_challenge', status: 'PENDING' })
      .mockResolvedValueOnce({ id: 'mock_tx_challenge', status: 'APPROVED' }); // Second poll is APPROVED

    const { container } = render(<Wompi3DS {...baseProps} threeDsAuthType="challenge" />);

    // 1. Initial steps until createTransaction
    await waitFor(() => {
      expect(mockCreateTransaction).toHaveBeenCalledTimes(1);
      expect(mockCreateTransaction).toHaveBeenCalledWith(
        'mock_acceptance_token', // From default mockGetAcceptanceToken
        'mock_card_token',     // From default mockTokenizeCard
        expect.objectContaining({ three_ds_auth_type: 'challenge' })
      );
    });

    // 2. Check for iframe rendering
    await waitFor(() => {
      expect(screen.getByText('Status:', { exact: false })).toHaveTextContent('Status: awaitingChallenge');
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', 'https://mock-3ds-server.com/challengeframe?id=mock_tx_challenge');
    });

    // Our component has a useEffect that simulates challenge completion (setTimeout)
    // then changes step to 'pollingStatus'.
    // We need to advance timers for this simulation and for polling.

    // Fast-forward timers to trigger the simulated challenge completion (5s in component)
    // and the first polling interval (another 5s in component)
    // jest.advanceTimersByTime(5000); // For challenge simulation

    await waitFor(() => {
         expect(screen.getByText('Status:', { exact: false })).toHaveTextContent('Status: pollingStatus');
    }, {timeout: 6000}); // Wait for simulated challenge to complete (5s) + buffer


    // jest.advanceTimersByTime(5000); // For first poll

    await waitFor(() => {
      expect(mockGetTransactionStatus).toHaveBeenCalledWith('mock_tx_challenge');
    }, {timeout: 6000}); // Wait for polling to occur (another 5s) + buffer

    // jest.advanceTimersByTime(5000); // For second poll if first was PENDING

    await waitFor(() => {
      expect(baseProps.onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mock_tx_challenge',
          status: 'APPROVED',
        })
      );
      expect(screen.getByText('Status:', { exact: false })).toHaveTextContent('Status: completed');
    }, {timeout: 6000});
    // jest.useRealTimers();
  });

  test('Error Flow (e.g., createTransaction fails): calls onError and displays error message', async () => {
    mockCreateTransaction.mockRejectedValueOnce(new Error('Network Error'));

    render(<Wompi3DS {...baseProps} />);

    await waitFor(() => {
      expect(mockCreateTransaction).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(baseProps.onError).toHaveBeenCalledWith(new Error('Network Error'));
    });

    expect(screen.getByText('Status:', { exact: false })).toHaveTextContent('Status: failed');
    // Check for the generic error message part, specific message might vary.
    expect(screen.getByText('Error', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Network Error', { exact: false })).toBeInTheDocument();
  });

  test('Error Flow (transaction DECLINED): calls onError and displays status', async () => {
    mockCreateTransaction.mockResolvedValueOnce({
      id: 'mock_tx_declined',
      status: 'DECLINED',
      // other fields as Wompi would send for a declined transaction
    });

    render(<Wompi3DS {...baseProps} />);

    await waitFor(() => {
      expect(mockCreateTransaction).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(baseProps.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mock_tx_declined',
          status: 'DECLINED',
        })
      );
    });
    expect(screen.getByText('Status:', { exact: false })).toHaveTextContent('Status: failed');
    expect(screen.getByText('Payment Failed/Declined')).toBeInTheDocument();
    expect(screen.getByText('Transaction ID: mock_tx_declined')).toBeInTheDocument();
  });


  test('threeDsAuthType="error" Flow: calls onError', async () => {
    // Simulate Wompi returning an error immediately when 'three_ds_auth_type: "error"' is used
    // This might be a specific error object or just a transaction status of ERROR/DECLINED
    mockCreateTransaction.mockResolvedValueOnce({
      id: 'mock_tx_3ds_error',
      status: 'ERROR', // Or 'DECLINED' depending on Wompi's actual response for this
      error_message: '3DS authentication type "error" simulated by merchant.',
    });

    render(<Wompi3DS {...baseProps} threeDsAuthType="error" />);

    await waitFor(() => {
      expect(mockCreateTransaction).toHaveBeenCalledWith(
        'mock_acceptance_token',
        'mock_card_token',
        expect.objectContaining({
          three_ds_auth_type: 'error',
        })
      );
    });

    await waitFor(() => {
      expect(baseProps.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mock_tx_3ds_error',
          status: 'ERROR',
        })
      );
    });
    expect(screen.getByText('Status:', { exact: false })).toHaveTextContent('Status: failed');
    // Depending on how you want to display this, check for relevant error message
    expect(screen.getByText('Payment Failed/Declined')).toBeInTheDocument();
  });
});
