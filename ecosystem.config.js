module.exports = {
  apps: [
    {
      name: "my-app",
      script: "lib/bot.js",
      watch: ["lib"],
      ignore_watch: ["*.log"],
      interpreter: "node",
      interpreter_args: "--max-old-space-size=4096",
      watch_delay: 500,
      ext: "js,json",
      restart_delay: 1000 // Add a delay of 1000ms (1 second) before restarting
    }
  ]
};
