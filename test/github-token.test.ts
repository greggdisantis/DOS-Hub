import { describe, it, expect } from "vitest";

describe("GitHub Token Validation", () => {
  it("should have GITHUB_TOKEN environment variable set", () => {
    const token = process.env.GITHUB_TOKEN;
    expect(token).toBeDefined();
    expect(token).toBeTruthy();
    expect(token).toMatch(/^ghp_/);
  });

  it("should be able to authenticate with GitHub API using the token", async () => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GITHUB_TOKEN not set");
    }

    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${token}`,
        "Accept": "application/vnd.github.v3+json",
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.login).toBeDefined();
  });

  it("should have workflow permissions", async () => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GITHUB_TOKEN not set");
    }

    const response = await fetch(
      "https://api.github.com/repos/greggdisantis/DOS-Hub/actions/workflows",
      {
        headers: {
          Authorization: `token ${token}`,
          "Accept": "application/vnd.github.v3+json",
        },
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.workflows).toBeDefined();
  });
});
