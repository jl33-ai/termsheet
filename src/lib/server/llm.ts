import { OpenRouter } from '@openrouter/sdk';
import { OPENROUTER_API_KEY } from '$env/static/private';

const openRouter = new OpenRouter({
	apiKey: OPENROUTER_API_KEY
});

export async function llmGenerate(prompt: string) {
	const completion = await openRouter.chat.send({
		model: 'openai/gpt-4o',
		messages: [
			{
				role: 'user',
				content: prompt
			}
		],
		stream: false
	});

	return completion.choices[0].message.content;
}
