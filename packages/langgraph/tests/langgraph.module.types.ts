import { LangGraphModule } from '../src/langgraph.module';

LangGraphModule.forRootAsync({
  useFactory: () => ({
    checkpointer: {},
    // @ts-expect-error Configure module scope with the top-level global option.
    global: true,
  }),
});
