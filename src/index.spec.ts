import { expect } from "chai";
import "mocha";
import { cli, DELIMITER } from "./";

describe("Initialze CLI", () => {
  it("should set correct delimiter", () => {
    // cli.exec('start')
    const delimiter = cli._delimiter;
    expect(delimiter).to.equal(DELIMITER);
  });
});
