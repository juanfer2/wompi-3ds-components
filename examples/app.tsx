import React from 'react';
import ReactDOM from 'react-dom';
import { Wompi3DS } from '../src'; // Assuming Wompi3DS is exported from src/index.ts

const App = () => {
  const handleSuccess = (transaction: any) => {
    console.log('Transaction Successful:', transaction);
    alert('Transaction Successful! Check console for details.');
  };

  const handleError = (error: any) => {
    console.error('Transaction Error:', error);
    alert('Transaction Error! Check console for details.');
  };

  // Example card data - in a real scenario, this would come from a form
  const mockCardData = {
    number: '4242424242424242', // Example Visa test card
    cvc: '123',
    exp_month: '12',
    exp_year: '25', // Corrected to '25' from original '2025' if it should be 2 digits for Wompi. Or '2025' if 4 digits. Assuming 2 for now.
    card_holder: 'Test User'
  };

  return (
    <div>
      <h1>Wompi3DS Component Local Test</h1>
      <Wompi3DS
        publicKey="pub_test_YOUR_WOMPI_PUBLIC_KEY" // Replace with a test public key if available or use from .env
        amountInCents={4900000} // Example: 49000.00 COP
        currency="COP"
        customerEmail="test@example.com"
        reference={`localtest-${Date.now()}`}
        cardData={mockCardData}
        threeDsAuthType="challenge" // Or 'no_challenge', 'error'
        onSuccess={handleSuccess}
        onError={handleError}
      />
      <hr />
      <p>
        Remember to replace <code>"pub_test_YOUR_WOMPI_PUBLIC_KEY"</code> with a valid Wompi test public key.
        If you have set up an <code>.env</code> file with <code>REACT_APP_WOMPI_PUBLIC_KEY</code>,
        you might need a build process that makes it available here, or you can manually paste it for this local test.
      </p>
      <p>
        Open your browser's developer console to see detailed logs from <code>onSuccess</code> and <code>onError</code> handlers.
      </p>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
