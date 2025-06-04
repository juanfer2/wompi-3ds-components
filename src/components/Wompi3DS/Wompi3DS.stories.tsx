import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import Wompi3DS, { Wompi3DSProps } from './Wompi3DS';

export default {
  title: 'Components/Wompi3DS',
  component: Wompi3DS,
  argTypes: {
    onSuccess: { action: 'onSuccess' },
    onError: { action: 'onError' },
    threeDsAuthType: {
      control: {
        type: 'select',
        options: ['challenge', 'no_challenge', 'error'],
      },
    },
    // Auto-generate controls for other props
  },
} as Meta<typeof Wompi3DS>;

const baseCardData = {
  number: '4242424242424242', // Visa test card
  cvc: '123',
  exp_month: '12',
  exp_year: '2030',
  card_holder: 'Test User',
};

const Template: StoryFn<Wompi3DSProps> = (args) => <Wompi3DS {...args} />;

export const Default = Template.bind({});
Default.args = {
  publicKey: 'pub_test_YOUR_WOMPI_PUBLIC_KEY',
  amountInCents: 50000,
  currency: 'COP',
  customerEmail: 'test@example.com',
  reference: `storybook_default_${Date.now()}`,
  cardData: baseCardData,
  onSuccess: action('onSuccess'),
  onError: action('onError'),
  threeDsAuthType: 'challenge',
};
Default.storyName = 'Default (Interactive)';

export const ChallengeRequired = Template.bind({});
ChallengeRequired.args = {
  ...Default.args,
  reference: `storybook_challenge_${Date.now()}`,
  threeDsAuthType: 'challenge',
};
ChallengeRequired.play = async ({ canvasElement }) => {
  // No specific play function needed for this story,
  // as the component's internal useEffect will trigger the flow.
  // Storybook will show the 'awaitingChallenge' step and iframe.
};


export const NoChallenge = Template.bind({});
NoChallenge.args = {
  ...Default.args,
  reference: `storybook_no_challenge_${Date.now()}`,
  threeDsAuthType: 'no_challenge',
  // Our mock API currently might still return a redirectUrl.
  // A more sophisticated mock would ensure no redirect/iframe for 'no_challenge'.
  // For now, the component logic tries to proceed to polling if not 'challenge'.
};
NoChallenge.play = async ({ canvasElement }) => {
  // Flow should proceed to polling and then complete/fail based on mock API behavior
};

export const ErrorCase = Template.bind({});
ErrorCase.args = {
  ...Default.args,
  reference: `storybook_error_case_${Date.now()}`,
  threeDsAuthType: 'error', // Wompi's 'error' type for 3DS
  // To make this more distinct, we could modify mock API for 'error' type
  // to immediately return a specific error from createTransaction if desired.
  // For now, it relies on the generic flow where 'error' might lead to a specific handling
  // or a general transaction error if Wompi processes it that way.
};
ErrorCase.play = async ({ canvasElement }) => {
  // Flow should ideally show an error quickly.
};
