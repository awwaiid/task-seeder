# Bracketology Ranker

A Vue.js application for ranking tasks using tournament-style bracket elimination.

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

## GitHub Pages Deployment

This repository is configured to automatically deploy to GitHub Pages when you push to the `main` branch.

### Setup Instructions:

1. **Enable GitHub Pages in your repository:**
   - Go to Settings → Pages
   - Source: "GitHub Actions"

2. **Update the base path (if needed):**
   - Edit `vite.config.js` and change `/bracketology-ranker/` to match your repository name
   - For example, if your repository is `username/my-tournament-app`, change it to `/my-tournament-app/`

3. **Push to main branch:**
   - The GitHub Action will automatically build and deploy your app
   - Your app will be available at `https://username.github.io/repository-name/`

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.