import { z } from 'zod';

// Keep browser validation compatible with script-src 'self': never probe or use eval.
z.config({ jitless: true });
