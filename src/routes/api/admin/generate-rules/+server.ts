import { json } from '@sveltejs/kit';
import { llmGenerate } from '$lib/server/llm.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
			const { question, rules: existingRules } = await request.json();
		
		if (!question || typeof question !== 'string') {
			return json({ error: 'Question is required' }, { status: 400 });
		}

			const existing = typeof existingRules === 'string' && existingRules.trim().length > 0
				? `\n\nExisting rules draft (user-provided):\n"""\n${existingRules.trim()}\n"""\n\nRefine or improve while preserving any correct constraints. If already sufficient, tighten language.\n`
				: '';

			// Provide current date to the model for time-aware rules
			const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

			const prompt = `You are an expert policy writer.
Today's date (UTC) is ${today}.
Given this prediction market question: "${question}"

Write extremely well‑written, highly specific, unambiguous resolution rules in 1–2 sentences that explain exactly how the market resolves. Requirements:
- Use precise, objective, and verifiable criteria
- Include relevant sources or verification criteria when appropriate
- Avoid subjective language and ambiguity
- Limit to 1–2 sentences
- Do not surround the output in quotation marks or code fences${existing}

Return only the final rules text with no surrounding quotes or extra commentary.`;

		const rules = await llmGenerate(prompt);
		const text = typeof rules === 'string' ? rules : '';
		return json({ rules: text.trim() });
	} catch (error) {
		console.error('Error generating rules:', error);
		return json({ error: 'Failed to generate rules' }, { status: 500 });
	}
};
