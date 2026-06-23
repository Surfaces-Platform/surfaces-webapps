import { judgmentKitAgentText } from '../content';

export function GET() {
  return new Response(judgmentKitAgentText, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}
