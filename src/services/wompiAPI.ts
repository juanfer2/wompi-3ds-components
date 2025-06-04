// TODO: Replace with actual API calls once live environment is available

export const getAcceptanceToken = async (publicKey: string): Promise<string> => {
  console.log('Fetching acceptance token with public key:', publicKey);
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  // Mocked response
  return 'mock_acceptance_token_123';
};

export const tokenizeCard = async (acceptanceToken: string, cardData: any): Promise<string> => {
  console.log('Tokenizing card with acceptance token:', acceptanceToken, 'and card data:', cardData);
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  // Mocked response
  return `mock_card_token_for_${cardData.number.slice(-4)}`;
};

export const createTransaction = async (
  acceptanceToken: string,
  cardToken: string,
  transactionData: any
): Promise<any> => {
  console.log(
    'Creating transaction with acceptance token:',
    acceptanceToken,
    'card token:',
    cardToken,
    'and transaction data:',
    transactionData
  );
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  // Mocked response
  const transactionId = `mock_transaction_id_${Date.now()}`;
  return {
    id: transactionId,
    status: 'PENDING', // Initial status, assuming 3DS redirection is needed
    redirectUrl: `https://mock-3ds-server.com/challenge?transactionId=${transactionId}`,
    ...transactionData,
  };
};

export const getTransactionStatus = async (transactionId: string): Promise<any> => {
  console.log('Fetching status for transaction ID:', transactionId);
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  // Mocked response - simulate different outcomes
  const randomNumber = Math.random();
  let status;
  if (randomNumber < 0.7) {
    status = 'APPROVED';
  } else if (randomNumber < 0.9) {
    status = 'DECLINED';
  } else {
    status = 'ERROR';
  }
  return {
    id: transactionId,
    status: status,
  };
};
