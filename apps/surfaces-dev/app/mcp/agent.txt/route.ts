import { mcpAgentIndexText } from '../discovery';

export function GET() {
  return new Response(mcpAgentIndexText, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}

