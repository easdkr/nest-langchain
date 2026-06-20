export class DeterministicChatModel {
  constructor(private readonly role: string) {}

  async invoke(input: unknown) {
    return {
      content: `${this.role}:${stringifyInput(input)}`,
    };
  }

  bindTools() {
    return {
      invoke: async () => ({
        content: `${this.role}:called score_plan`,
        tool_calls: [
          {
            name: "score_plan",
            args: {
              score: 9,
              reason: "critic approved",
            },
          },
        ],
      }),
    };
  }

  withStructuredOutput() {
    return {
      invoke: async () => ({
        decision: "ship",
        owner: this.role,
      }),
    };
  }
}

function stringifyInput(input: unknown): string {
  if (typeof input === "string") {
    return input;
  }

  return JSON.stringify(input);
}
