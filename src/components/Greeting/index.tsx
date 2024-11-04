import React from "react";

export interface GreetingProps {
  message: string;
}

export function Greeting({ message }: Readonly<GreetingProps>) {
  return <div>Hello, {message}!</div>;
}

export default Greeting;
