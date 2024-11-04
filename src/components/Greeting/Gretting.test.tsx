import React from "react";
import { render } from "@testing-library/react";
import { Greeting } from ".";

describe("Greeting", () => {
  test("renders the Greeting component", () => {
    render(<Greeting message="Hello world!" />);
  });
});
