import { Module } from '@nestjs/common';
import { LLM_PROVIDER } from './llm-provider';
import { OpenRouterProvider } from './openrouter.provider';

@Module({
  providers: [{ provide: LLM_PROVIDER, useFactory: () => new OpenRouterProvider() }],
  exports: [LLM_PROVIDER],
})
export class LlmModule {}
