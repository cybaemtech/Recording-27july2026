module.exports = {
  apps: [
    {
      name: "monitorpro-api",
      script: "./dist/index.mjs",
      cwd: "./artifacts/api-server",
      interpreter: "node",
      node_args: "--env-file=.env",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
