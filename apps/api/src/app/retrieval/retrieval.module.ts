import { Module } from '@nestjs/common';
import { AnswerPolicy } from './answer-policy';
import { RetrievalService } from './retrieval.service';

@Module({
  providers: [RetrievalService, { provide: AnswerPolicy, useFactory: () => new AnswerPolicy() }],
  exports: [RetrievalService, AnswerPolicy],
})
export class RetrievalModule {}
