import { describe, it, expect } from "vitest";
import { answerQuestion, generateTrainingMaterial, generateQuiz } from "../openai-service";

describe("OpenAI Service", () => {
  it("should answer DOS Hub questions", async () => {
    const answer = await answerQuestion("What is DOS Hub?");
    expect(answer).toBeDefined();
    expect(answer.length).toBeGreaterThan(0);
    expect(answer.toLowerCase()).toContain("dos");
  });

  it("should refuse personal questions", async () => {
    const answer = await answerQuestion("Tell me about Gregg DiSantis");
    expect(answer).toBeDefined();
    expect(answer).toContain("DOS Hub operational questions");
  });

  it("should generate training material", async () => {
    const material = await generateTrainingMaterial("DOS Hub order management");
    expect(material).toBeDefined();
    expect(material.length).toBeGreaterThan(100);
  }, { timeout: 15000 });

  it("should generate quiz questions", async () => {
    const trainingMaterial = "DOS Hub is a software system for managing orders and operations.";
    const quiz = await generateQuiz(trainingMaterial, 3);
    expect(quiz).toBeDefined();
    expect(quiz).toContain("Q");
    expect(quiz).toContain("Answer:");
  }, { timeout: 15000 });
});
