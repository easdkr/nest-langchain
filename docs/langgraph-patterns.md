# LangGraph Patterns

This project keeps LangGraph execution-control patterns in `@nest-langchain/langgraph`, not in core.

## Supported Primitives

| Pattern            | API                                                                    | Use When                                                                        |
| ------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Command routing    | `commandTo`, `@GraphNode({ ends })`, `CommandNode`, `RouteCommandNode` | A node must update state and choose the next node in one return value           |
| Parent handoff     | `parentHandoff`, `ParentHandoffNode`                                   | A subgraph worker must return control to a supervisor/parent graph              |
| Send fan-out       | `sendTo`, `fanOut`                                                     | Router, map-reduce, and orchestrator-worker flows need dynamic parallel work    |
| Human-in-the-loop  | `interruptFor`, `resumeWith`                                           | A graph must pause for approval, edit, rejection, or external input             |
| Subgraph transform | `callSubgraph`                                                         | Parent and subgraph state schemas differ and need explicit input/output mapping |

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
