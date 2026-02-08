import { LoopsClient } from "loops";

// Create a lazy-initialized Loops client to avoid build-time errors
let _loops: LoopsClient | null = null;

function getLoopsClient(): LoopsClient {
  if (!_loops) {
    if (!process.env.LOOPS_API_KEY) {
      throw new Error("LOOPS_API_KEY environment variable is not set");
    }
    _loops = new LoopsClient(process.env.LOOPS_API_KEY);
  }
  return _loops;
}

// Export a proxy that lazily initializes the client
export const loops = new Proxy({} as LoopsClient, {
  get(_target, prop) {
    const client = getLoopsClient();
    const value = client[prop as keyof LoopsClient];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
