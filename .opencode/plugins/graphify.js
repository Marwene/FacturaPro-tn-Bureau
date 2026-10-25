// graphify OpenCode plugin (API V2).
// Injects a knowledge graph reminder after bash tool calls when the graph exists.
import { existsSync } from "node:fs";
import { join } from "node:path";

const REMINDER =
  '[graphify] knowledge graph at graphify-out/. Pour les questions ciblées, lancez `graphify query "<question>"` (sous-graphe, plus petit que GRAPH_REPORT.md). Lisez GRAPH_REPORT.md seulement pour une vue architecture globale.\n';

const graphifyPlugin = {
  id: "graphify",

  async setup(ctx) {
    // One injection per session (module closure flag, as in the V1 plugin).
    let reminded = false;

    await ctx.tool.hook("execute.after", async (event) => {
      if (reminded) return;
      // Only successful executions carry a result to rewrite.
      if (event.status !== "completed") return;
      if (event.tool !== "bash") return;
      if (!existsSync(join(ctx.location.directory, "graphify-out", "graph.json"))) return;

      const result = event.result;
      if (typeof result.output === "string") {
        // bash returns { output, metadata }: this is the V2 equivalent of the V1 `output.output`.
        event.result = { ...result, output: REMINDER + result.output };
      } else if (typeof result.content === "string") {
        event.result = { ...result, content: REMINDER + result.content };
      } else if (Array.isArray(result.content)) {
        event.result = { ...result, content: [{ type: "text", text: REMINDER }, ...result.content] };
      } else {
        return;
      }

      reminded = true;
    });
  },
};

export default graphifyPlugin;
