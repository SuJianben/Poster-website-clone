const MCP_ENDPOINT = "/api/mcp";

export async function callBackendTool(toolName: string, args: Record<string, unknown>) {
  const response = await fetch(MCP_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
  });

  if (!response.ok) throw new Error(`Backend tool call failed (${response.status})`);

  const json = await response.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result;
}
