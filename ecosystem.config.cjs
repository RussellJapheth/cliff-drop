module.exports = {
    apps: [
        {
            name: "drop",
            script: "./build/index.js",
            interpreter: "node",
            interpreter_args: "--env-file=.env",
            env: {
                NODE_ENV: "production",
                PORT: 3500,
                BODY_SIZE_LIMIT: "5G",
                ORIGIN: process.env.ORIGIN,
            },
            instances: 1,
            exec_mode: "fork",
            autorestart: true,
            watch: false,
            max_memory_restart: "250M",
            time: true,
        },
    ],
};
