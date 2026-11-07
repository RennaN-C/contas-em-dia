// Tests never activate a real bot from a developer's .env.
process.env.DISCORD_ENABLED = 'false';
process.env.METRICS_ENABLED = 'false';
