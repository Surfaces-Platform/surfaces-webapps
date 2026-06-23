import { surfacesDevLlmsText } from '../mcp/discovery';

export function GET() {
  return new Response(surfacesDevLlmsText, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}

