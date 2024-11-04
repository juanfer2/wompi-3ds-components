import React from "react";

interface Props {
  message: string;
}

export function Greeting({ message }: Readonly<Props>) {
  return <div>Hello, {message}!</div>;
}

export default Greeting;
