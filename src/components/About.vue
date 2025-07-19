<template>
  <div class="container about-page">
    <button class="back-button" @click="$emit('go-home')">
      ← Back to TaskSeeder
    </button>

    <h1>About TaskSeeder</h1>

    <div class="intro-section">
      <p class="lead">
        TaskSeeder helps you prioritize your backlog using tournament-style
        bracket elimination. Let your tasks compete head-to-head until you have
        a clear ranking.
      </p>
    </div>

    <div class="how-it-works">
      <h2>How It Works</h2>

      <div class="step">
        <h3>1. Upload Your Tasks</h3>
        <p>
          Export your tasks from any project management tool (Asana, Linear,
          Jira, etc.) as a CSV file and upload it to TaskSeeder.
        </p>
        <div class="visual-guide">
          <div class="mock-upload">
            <div class="upload-box">📁 Click to upload or drag CSV here</div>
            <div class="csv-preview">
              <strong>Preview:</strong> Task Name, Priority, Assignee...
            </div>
          </div>
        </div>
      </div>

      <div class="step">
        <h3>2. Choose Your Tournament Style</h3>
        <p>
          Select between single elimination (faster) or double elimination (more
          accurate rankings). Configure which task fields you want to see during
          comparisons.
        </p>
        <div class="visual-guide">
          <div class="tournament-options">
            <div class="option">
              <strong>Single Elimination</strong><br />
              Fast • Each task eliminated after one loss
            </div>
            <div class="option">
              <strong>Double Elimination</strong><br />
              Accurate • Tasks get a second chance
            </div>
          </div>
        </div>
      </div>

      <div class="step">
        <h3>3. Make Head-to-Head Choices</h3>
        <p>
          Compare two tasks at a time and choose which is more important.
          TaskSeeder handles the tournament bracket logic behind the scenes.
        </p>
        <div class="visual-guide">
          <div class="mock-matchup">
            <div class="task-option">
              <strong>Fix login bug</strong><br />
              <small>Priority: High • Complexity: Low</small>
            </div>
            <div class="vs">VS</div>
            <div class="task-option">
              <strong>Add dark mode</strong><br />
              <small>Priority: Medium • Complexity: High</small>
            </div>
          </div>
        </div>
      </div>

      <div class="step">
        <h3>4. Get Your Rankings</h3>
        <p>
          After all matchups are complete, see your tasks ranked from highest to
          lowest priority. Export the results or share them with your team.
        </p>
        <div class="visual-guide">
          <div class="mock-results">
            <div class="rank-item"><strong>1.</strong> Fix login bug</div>
            <div class="rank-item">
              <strong>2.</strong> Update API documentation
            </div>
            <div class="rank-item"><strong>3.</strong> Add dark mode</div>
            <div class="rank-item">
              <strong>4.</strong> Refactor user service
            </div>
          </div>
        </div>
      </div>

      <div class="step">
        <h3>5. Update Your Rankings</h3>
        <p>
          Re-import your ranked CSV and use it as the seeded ranking for your
          next tournament. This lets you continuously refine your priorities as
          new tasks are added, powering your next development sprint with an
          updated backlog order.
        </p>
        <div class="visual-guide">
          <div class="cycle-diagram">
            <div class="cycle-step">📥 Export ranked CSV</div>
            <div class="cycle-arrow">→</div>
            <div class="cycle-step">➕ Add new tasks</div>
            <div class="cycle-arrow">→</div>
            <div class="cycle-step">📤 Re-import as seeded tournament</div>
            <div class="cycle-arrow">→</div>
            <div class="cycle-step">🚀 Power next sprint</div>
          </div>
        </div>
      </div>
    </div>

    <div class="features-section">
      <h2>Features</h2>
      <div class="features-grid">
        <div class="feature">
          <h4>🏆 Tournament Brackets</h4>
          <p>Single and double elimination tournaments for fair ranking</p>
        </div>
        <div class="feature">
          <h4>💾 Save & Resume</h4>
          <p>Your progress is automatically saved in your browser</p>
        </div>
        <div class="feature">
          <h4>🔗 Share Results</h4>
          <p>Generate shareable URLs to collaborate with your team</p>
        </div>
        <div class="feature">
          <h4>📱 Mobile Friendly</h4>
          <p>Works great on desktop and mobile devices</p>
        </div>
        <div class="feature">
          <h4>📊 Export Rankings</h4>
          <p>Download your final rankings as CSV</p>
        </div>
        <div class="feature">
          <h4>🎯 Match History</h4>
          <p>See how each task performed throughout the tournament</p>
        </div>
      </div>
    </div>

    <div class="getting-started">
      <h2>Getting Started</h2>
      <p>Ready to prioritize your backlog? Here's what you need:</p>
      <ul>
        <li>
          A CSV file with your tasks (exported from your project management
          tool)
        </li>
        <li>At least 2 tasks to compare (though it works better with more!)</li>
        <li>A few minutes to make head-to-head decisions</li>
      </ul>
      <button class="cta-button" @click="$emit('go-home')">
        Start Ranking Your Tasks
      </button>
    </div>

    <div class="footer-info">
      <p>
        TaskSeeder is an open-source project. Found a bug or have a feature
        request?
        <a
          href="https://github.com/awwaiid/task-seeder/discussions"
          target="_blank"
          >Join the discussion</a
        >
        or
        <a href="https://github.com/awwaiid/task-seeder" target="_blank"
          >view the source code</a
        >.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  'go-home': [];
}>();
</script>

<style scoped>
.about-page {
  margin: 0 auto;
  line-height: 1.7;
}

.back-button {
  background: none;
  border: 1px solid var(--border);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--primary);
  margin-bottom: 2rem;
  transition: all 0.2s;
}

.back-button:hover {
  background-color: var(--light);
  border-color: var(--secondary);
}

.about-page h1 {
  color: var(--primary);
  margin-bottom: 1rem;
}

.intro-section .lead {
  font-size: 1.125rem;
  color: var(--primary);
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--light);
  border-radius: 8px;
  border-left: 4px solid var(--secondary);
}

.how-it-works {
  margin: 3rem 0;
}

.step {
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #eee;
}

.step h3 {
  color: var(--secondary);
  margin-bottom: 1rem;
}

.visual-guide {
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.mock-upload .upload-box {
  background: white;
  border: 2px dashed var(--border);
  padding: 2rem;
  text-align: center;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.csv-preview {
  font-size: 0.875rem;
  color: #666;
}

.tournament-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.option {
  background: white;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #ddd;
  text-align: center;
}

.mock-matchup {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: center;
}

.task-option {
  background: white;
  padding: 1rem;
  border-radius: 6px;
  border: 2px solid var(--secondary);
  flex: 1;
  text-align: center;
  cursor: pointer;
}

.vs {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--accent);
}

.mock-results {
  background: white;
  border-radius: 6px;
  overflow: hidden;
}

.rank-item {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eee;
}

.rank-item:last-child {
  border-bottom: none;
}

.features-section {
  margin: 3rem 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.feature {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.feature h4 {
  margin-bottom: 0.5rem;
  color: var(--primary);
}

.getting-started {
  margin: 3rem 0;
  padding: 2rem;
  background: var(--light);
  border-radius: 8px;
  text-align: center;
}

.getting-started ul {
  text-align: left;
  max-width: 400px;
  margin: 1.5rem auto;
}

.cta-button {
  background: var(--secondary);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 1.125rem;
  cursor: pointer;
  margin-top: 1rem;
  transition: all 0.2s;
}

.cta-button:hover {
  background: #2980b9;
  transform: translateY(-1px);
}

.footer-info {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid #eee;
  text-align: center;
  color: #666;
}

.footer-info a {
  color: var(--secondary);
  text-decoration: none;
}

.footer-info a:hover {
  text-decoration: underline;
}

.cycle-diagram {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.cycle-step {
  background: white;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  border: 2px solid var(--secondary);
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
  min-width: 120px;
}

.cycle-arrow {
  font-size: 1.25rem;
  color: var(--secondary);
  font-weight: bold;
}

@media (max-width: 768px) {
  .mock-matchup {
    flex-direction: column;
  }

  .tournament-options {
    grid-template-columns: 1fr;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .cycle-diagram {
    flex-direction: column;
    gap: 0.75rem;
  }

  .cycle-arrow {
    transform: rotate(90deg);
  }
}
</style>
