import { Injectable } from '@nestjs/common';
import { Annotation } from '@langchain/langgraph';
import { GraphNode, LangGraph } from '@nest-langchain/langgraph';

const JokeState = Annotation.Root({
  topic: Annotation<string>(),
  result: Annotation<string>(),
});

@LangGraph({
  name: 'joke',
  state: JokeState,
  entry: 'writeAnswer',
  finish: 'writeAnswer',
  tags: ['demo', 'visualization'],
})
@Injectable()
export class JokeGraph {
  @GraphNode()
  writeAnswer(state: typeof JokeState.State) {
    return {
      result: `${state.topic} graph docs are hosted under /ai/graphs.`,
    };
  }
}
