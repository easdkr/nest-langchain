import { Injectable } from '@nestjs/common';
import { Annotation } from '@langchain/langgraph';

import { GraphNode, LangGraph, TraceableRun } from '@nest-langchain/core';

const JokeState = Annotation.Root({
  topic: Annotation<string>(),
  language: Annotation<'ko' | 'en'>(),
  draft: Annotation<string>(),
  answer: Annotation<string>(),
});

@LangGraph({
  name: 'joke',
  state: JokeState,
  entry: 'draft',
  edges: [['draft', 'localize']],
  finish: 'localize',
  tags: ['demo', 'joke'],
})
@Injectable()
export class JokeGraph {
  @GraphNode()
  @TraceableRun({
    name: 'Draft joke',
    runType: 'chain',
    tags: ['draft'],
  })
  draft(state: typeof JokeState.State) {
    return {
      draft: `A ${state.topic} graph walked into a NestJS module and registered itself before the controller noticed.`,
    };
  }

  @GraphNode()
  @TraceableRun({
    name: 'Localize joke',
    runType: 'parser',
    tags: ['localize'],
  })
  localize(state: typeof JokeState.State) {
    if (state.language === 'en') {
      return {
        answer: state.draft,
      };
    }

    return {
      answer: `${state.topic} 그래프가 NestJS 모듈에 들어오더니 컨트롤러가 눈치채기 전에 스스로 등록됐습니다.`,
    };
  }
}

