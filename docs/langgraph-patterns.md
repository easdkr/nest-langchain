# LangGraph Patterns

[English](langgraph-patterns.md) | [한국어](langgraph-patterns.ko.md)

This project keeps LangGraph execution-control patterns in `@nest-langchain/langgraph`, not in core.

## Supported Primitives

| Pattern            | API                                                                    | Use When                                                                        |
| ------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Command routing    | `commandTo`, `@GraphNode({ ends })`, `CommandNode`, `RouteCommandNode` | A node must update state and choose the next node in one return value           |
| Parent handoff     | `parentHandoff`, `ParentHandoffNode`                                   | A subgraph worker must return control to a supervisor/parent graph              |
| Send fan-out       | `sendTo`, `fanOut`                                                     | Router, map-reduce, and orchestrator-worker flows need dynamic parallel work    |
| Human-in-the-loop  | `interruptFor`, `resumeWith`                                           | A graph must pause for approval, edit, rejection, or external input             |
| Subgraph transform | `callSubgraph`                                                         | Parent and subgraph state schemas differ and need explicit input/output mapping |
| Typed graph keys   | `defineTypedLangGraph`                                                 | A graph should use compile-time checked local node keys instead of raw strings  |

## Typed Graph Builder

`defineTypedLangGraph()` wraps the existing decorators and helper functions. It
does not change discovery or graph execution; it only converts typed local node
keys into the string node names that LangGraph already expects.

```ts
const support = defineTypedLangGraph({
  name: 'support-intake',
  state: SupportState,
  nodes: {
    classify: 'classifyAndRoute',
    billing: 'handleBilling',
    draft: 'draftResponse',
  },
} as const);

@support.Graph({
  edges: support.edges(['billing', 'draft']),
})
class SupportGraph {
  @support.Node('classify', {
    entry: true,
    ends: support.ends('billing'),
  })
  classify() {
    return support.commandTo('billing', {
      update: { intent: 'billing' },
    });
  }

  @support.Node('billing')
  handleBilling() {
    return {
      intent: 'billing',
    };
  }

  @support.Node('draft', {
    finish: true,
  })
  draft() {
    return {};
  }
}
```

Use typed helpers for same-graph routing. Keep `parentHandoff`,
`ParentHandoffNode`, and remote `CommandNode` destinations string-based because
those destinations are outside the local node map.

## Design Notes

- `@GraphNode({ ends })` maps to LangGraph `addNode(..., { ends })`. Use it with same-graph `Command` nodes so the graph knows possible dynamic destinations.
- `parentHandoff` sets `graph: Command.PARENT`. This is only valid from a node running inside a subgraph.
- Parent handoff destinations belong to the parent graph, so `ParentHandoffNode` does not infer `ends` automatically.
- `fanOut` returns `Send[]`; use it from conditional edge handlers or router functions when worker count is only known at runtime.
- `interruptFor` should not be wrapped in `try/catch`; side effects before an interrupt must be idempotent.
- `callSubgraph` keeps schema conversion explicit. This matches the common community guidance for parent and child graphs with different state keys.

## Multi-Agent Mapping

Official and community examples repeatedly converge on these structures:

- Supervisor/subagents: central agent invokes specialist agents as tools or graph nodes.
- Handoffs: current specialist transfers control to another agent or back to a parent supervisor.
- Router: classify first, dispatch to one or more specialists, then synthesize.
- Skills: load specialized prompt/context on demand rather than keeping all context in the active agent.
- Custom workflow: mix deterministic graph nodes, LLM calls, tools, subgraphs, and human interrupts.

`@nest-langchain/langgraph` covers graph execution primitives. `@nest-langchain/patterns` covers provider collaboration and Deep Agents decorator adapters.
