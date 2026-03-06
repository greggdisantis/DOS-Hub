import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  answerQuestion,
  generateTrainingMaterial,
  generateQuiz,
} from "./openai-service";

export const aiRouter = router({
  askQuestion: publicProcedure
    .input(z.object({ question: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const answer = await answerQuestion(input.question);
      return { answer };
    }),

  generateTrainingMaterial: publicProcedure
    .input(z.object({ topic: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const material = await generateTrainingMaterial(input.topic);
      return { material };
    }),

  generateQuiz: publicProcedure
    .input(
      z.object({
        trainingMaterial: z.string().min(1),
        numQuestions: z.number().int().min(1).max(20).default(5),
      })
    )
    .mutation(async ({ input }) => {
      const quiz = await generateQuiz(input.trainingMaterial, input.numQuestions);
      return { quiz };
    }),
});
