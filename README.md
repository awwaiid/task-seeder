# TaskSeeder

A Vue.js application for ranking tasks using tournament-style bracket elimination. Hosted at [taskseeder.com](https://taskseeder.com).

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run e2e tests
npm run test:e2e
```

## Deployment

This repository is configured to automatically deploy to taskseeder.com when you push to the `main` branch.

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Future Ideas

* User accounts and sign-ups
* Integrate with project management tools:
  * Import filtered task lists from Asana, Linear, Jira, etc.
  * Rank the items using tournament brackets
  * Push back the updated priorities to the source system

