import { describe, it, expect } from "vitest";

describe("Deploy to Production Endpoint", () => {
  it("should trigger GitHub Actions workflow", async () => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GITHUB_TOKEN not set");
    }

    const owner = "greggdisantis";
    const repo = "DOS-Hub";
    const workflowId = "242198057"; // Numeric ID for deploy-to-cloud-run.yml

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `token ${token}`,
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: "main",
        }),
      }
    );

    // GitHub API returns 204 No Content on success
    expect(response.status).toBe(204);
  });

  it("should have correct workflow file", async () => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GITHUB_TOKEN not set");
    }

    const owner = "greggdisantis";
    const repo = "DOS-Hub";

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows`,
      {
        headers: {
          Authorization: `token ${token}`,
          "Accept": "application/vnd.github.v3+json",
        },
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    const deployWorkflow = data.workflows.find(
      (w: any) => w.name === "Deploy to Google Cloud Run"
    );
    expect(deployWorkflow).toBeDefined();
    expect(deployWorkflow.state).toBe("active");
  });
});
