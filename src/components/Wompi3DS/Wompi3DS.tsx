import React, { useState, useEffect } from 'react';
import {
  getAcceptanceToken,
  tokenizeCard,
  createTransaction,
  getTransactionStatus,
} from '../../services/wompiAPI';

interface Wompi3DSProps {
  publicKey: string;
  amountInCents: number;
  currency: string;
  customerEmail: string;
  reference: string;
  onSuccess: (transaction: any) => void;
  onError: (error: any) => void;
  threeDsAuthType?: 'challenge' | 'no_challenge' | 'error'; // Defaults to 'challenge'
  cardData: {
    number: string;
    cvc: string;
    exp_month: string;
    exp_year: string;
    card_holder: string;
  };
}

type Wompi3DStep =
  | 'idle'
  | 'gettingAcceptanceToken'
  | 'tokenizingCard'
  | 'creatingTransaction'
  | 'pollingStatus'
  | 'awaitingChallenge'
  | 'completed'
  | 'failed';

const Wompi3DS: React.FC<Wompi3DSProps> = ({
  publicKey,
  amountInCents,
  currency,
  customerEmail,
  reference,
  onSuccess,
  onError,
  threeDsAuthType = 'challenge',
  cardData,
}) => {
  const [currentStep, setCurrentStep] = useState<Wompi3DStep>('idle');
  const [transaction, setTransaction] = useState<any>(null);
  const [iframeHTML, setIframeHTML] = useState<string | null>(null);
  const [error, setError] = useState<any | null>(null);

  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;

    const startPaymentFlow = async () => {
      try {
        setCurrentStep('gettingAcceptanceToken');
        setError(null);
        setIframeHTML(null);
        const acceptanceToken = await getAcceptanceToken(publicKey);

        setCurrentStep('tokenizingCard');
        const cardToken = await tokenizeCard(acceptanceToken, cardData);

        setCurrentStep('creatingTransaction');
        const transactionPayload = {
          amount_in_cents: amountInCents,
          currency: currency,
          customer_email: customerEmail,
          payment_method: {
            type: 'CARD',
            token: cardToken,
            installments: 1, // Or make this a prop
          },
          reference: reference,
          is_three_ds: true,
          three_ds_auth_type: threeDsAuthType,
        };
        const initialTransaction = await createTransaction(
          acceptanceToken,
          cardToken,
          transactionPayload
        );
        setTransaction(initialTransaction);

        if (initialTransaction.status === 'PENDING' && initialTransaction.redirectUrl) {
          // This is a simplified assumption based on the mock.
          // Real Wompi might provide iframeHTML directly or require navigation.
          // For this exercise, we'll assume redirectUrl implies a challenge is next.
          // We will use a mock iframe content for 'awaitingChallenge' if no specific HTML is given.
           if (initialTransaction.three_ds_method_data?.iframeHTML) {
            setIframeHTML(initialTransaction.three_ds_method_data.iframeHTML);
          } else {
            // Mock iframe for challenge if not provided.
            // In a real scenario, you'd get this from Wompi or handle redirection.
            setIframeHTML(`<iframe src="${initialTransaction.redirectUrl}" width="400" height="400" title="3DS Challenge"></iframe>`);
          }
          setCurrentStep('awaitingChallenge');
          // No polling yet, user needs to complete challenge.
          // We'll simulate challenge completion and then start polling, or poll immediately if no challenge needed.
          // For now, we'll assume a redirect happens and polling will be initiated by another event (e.g. message from iframe or redirect back to site)
          // To simplify for this exercise, if it's 'challenge' we'll just show the iframe and then manually trigger polling start later.
          // If no_challenge, we proceed to polling directly.
          if (threeDsAuthType !== 'challenge') {
            setCurrentStep('pollingStatus');
          }

        } else if (initialTransaction.status === 'APPROVED') {
          onSuccess(initialTransaction);
          setCurrentStep('completed');
        } else {
          // Any other initial status (DECLINED, ERROR)
          onError(initialTransaction);
          setCurrentStep('failed');
        }
      } catch (e: any) {
        console.error('Payment flow error:', e);
        setError(e.message || 'An unknown error occurred');
        onError(e);
        setCurrentStep('failed');
      }
    };

    if (currentStep === 'idle' && publicKey && cardData) {
      // Automatically start flow when component is ready and props are available
      // In a real app, this might be triggered by a button click
      startPaymentFlow();
    }

    // Polling logic
    if (currentStep === 'pollingStatus' && transaction?.id) {
      pollingInterval = setInterval(async () => {
        try {
          const statusResult = await getTransactionStatus(transaction.id);
          setTransaction(statusResult); // Update transaction with latest status

          if (statusResult.status === 'PENDING' && statusResult.three_ds_method_data?.iframeHTML) {
            // This case should ideally be handled before polling starts,
            // but as a fallback or if Wompi sends it during polling.
            setIframeHTML(statusResult.three_ds_method_data.iframeHTML);
            setCurrentStep('awaitingChallenge');
            if (pollingInterval) clearInterval(pollingInterval); // Stop polling
          } else if (statusResult.status === 'APPROVED') {
            onSuccess(statusResult);
            setCurrentStep('completed');
            if (pollingInterval) clearInterval(pollingInterval);
          } else if (statusResult.status === 'DECLINED' || statusResult.status === 'ERROR') {
            onError(statusResult);
            setCurrentStep('failed');
            if (pollingInterval) clearInterval(pollingInterval);
          }
          // If still PENDING but no iframeHTML, continue polling
        } catch (e: any) {
          console.error('Polling error:', e);
          setError(e.message || 'Polling failed');
          // Optionally stop polling on error or let it continue
          // For now, we let it continue, but this might need adjustment
        }
      }, 5000); // Poll every 5 seconds
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [
    publicKey,
    amountInCents,
    currency,
    customerEmail,
    reference,
    cardData,
    onSuccess,
    onError,
    threeDsAuthType,
    currentStep, // Added currentStep to dependencies to re-trigger effect when it changes
    transaction?.id // Added transaction.id to dependencies for polling
  ]);

  // Simulate challenge completion for 'challenge' auth type
  // In a real app, this would be triggered by a message from the iframe or a redirect
  useEffect(() => {
    if (currentStep === 'awaitingChallenge' && threeDsAuthType === 'challenge') {
      console.log("Simulating 3DS Challenge completion after 5 seconds...");
      const timer = setTimeout(() => {
        console.log("3DS Challenge simulation complete. Starting status polling.");
        // Clear iframe as challenge is "done"
        setIframeHTML(null);
        setCurrentStep('pollingStatus');
      }, 5000); // Simulate a 5-second challenge
      return () => clearTimeout(timer);
    }
  }, [currentStep, threeDsAuthType]);


  return (
    <div>
      <h3>Wompi 3DS Payment Flow</h3>
      <p>Status: <strong>{currentStep}</strong></p>

      {error && (
        <div style={{ color: 'red', border: '1px solid red', padding: '10px', margin: '10px 0' }}>
          <h4>Error</h4>
          <pre>{typeof error === 'string' ? error : JSON.stringify(error, null, 2)}</pre>
        </div>
      )}

      {currentStep === 'awaitingChallenge' && iframeHTML && (
        <div style={{ border: '1px dashed blue', padding: '10px', margin: '10px 0' }}>
          <h4>3DS Challenge</h4>
          <p>
            <em>(Simulating Wompi 3DS Challenge iframe. In a real scenario, ensure the HTML source is trusted.)</em>
          </p>
          <div dangerouslySetInnerHTML={{ __html: iframeHTML }} />
        </div>
      )}

      {currentStep === 'completed' && transaction && (
        <div style={{ color: 'green', border: '1px solid green', padding: '10px', margin: '10px 0' }}>
          <h4>Payment Successful!</h4>
          <p>Transaction ID: {transaction.id}</p>
          <p>Status: {transaction.status}</p>
        </div>
      )}

      {currentStep === 'failed' && transaction && (
        <div style={{ color: 'orange', border: '1px solid orange', padding: '10px', margin: '10px 0' }}>
          <h4>Payment Failed/Declined</h4>
          <p>Transaction ID: {transaction.id}</p>
          <p>Status: {transaction.status}</p>
        </div>
      )}

      {/* For debugging purposes, show transaction details if available */}
      {/* {transaction && (
        <details>
          <summary>Transaction Details (Debug)</summary>
          <pre>{JSON.stringify(transaction, null, 2)}</pre>
        </details>
      )} */}
    </div>
  );
};

export default Wompi3DS;
