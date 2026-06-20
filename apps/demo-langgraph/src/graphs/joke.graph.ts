import { Injectable } from '@nestjs/common';
import { Annotation } from '@langchain/langgraph';

import { GraphNode, LangGraph } from '@nest-langchain/langgraph';
import { TraceableRun } from '@nest-langchain/langsmith';

const JokeState = Annotation.Root({
  topic: Annotation<string>(),
  language: Annotation<'ko' | 'en'>(),
  draftText: Annotation<string>(),
  answer: Annotation<string>(),
});

@LangGraph({
  name: 'joke',
  state: JokeState,
  entry: 'draftJoke',
  edges: [['draftJoke', 'localizeJoke']],
  finish: 'localizeJoke',
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
  draftJoke(state: typeof JokeState.State) {
    return {
      draftText: `A ${state.topic} graph walked into a NestJS module and registered itself before the controller noticed.`,
    };
  }

  @GraphNode()
  @TraceableRun({
    name: 'Localize joke',
    runType: 'parser',
    tags: ['localize'],
  })
  localizeJoke(state: typeof JokeState.State) {
    if (state.language === 'en') {
      return {
        answer: state.draftText,
      };
    }

    return {
      answer: `${state.topic} 그래프가 NestJS 모듈에 들어오더니 컨트롤러가 눈치채기 전에 스스로 등록됐습니다.`,
    };
  }
}
