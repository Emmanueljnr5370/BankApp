const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { normalizeDateOfBirth } = require("../src/utils/dateUtils");

describe("normalizeDateOfBirth", () => {
  it("normalizes ISO dates and timestamps", () => {
    assert.equal(normalizeDateOfBirth("1990-05-20"), "1990-05-20");
    assert.equal(
      normalizeDateOfBirth("1990-05-20T00:00:00.000Z"),
      "1990-05-20",
    );
  });

  it("normalizes day-first numeric date formats", () => {
    assert.equal(normalizeDateOfBirth("20/05/1990"), "1990-05-20");
    assert.equal(normalizeDateOfBirth("20-05-1990"), "1990-05-20");
    assert.equal(normalizeDateOfBirth("20.05.1990"), "1990-05-20");
  });

  it("normalizes day-first month-name dates", () => {
    assert.equal(normalizeDateOfBirth("20-May-1990"), "1990-05-20");
    assert.equal(normalizeDateOfBirth("20 September 1990"), "1990-09-20");
  });

  it("rejects invalid or ambiguous dates", () => {
    assert.equal(normalizeDateOfBirth("1990-02-29"), null);
    assert.equal(normalizeDateOfBirth("31/04/1990"), null);
    assert.equal(normalizeDateOfBirth("05/20/1990"), null);
    assert.equal(normalizeDateOfBirth("not-a-date"), null);
    assert.equal(normalizeDateOfBirth(undefined), null);
  });

  it("normalizes valid Date values using their UTC calendar date", () => {
    assert.equal(
      normalizeDateOfBirth(new Date("1990-05-20T00:00:00.000Z")),
      "1990-05-20",
    );
    assert.equal(normalizeDateOfBirth(new Date("invalid")), null);
  });
});
