module.exports = {
    apps: [
        {
            name: "drop",
            script: "./server.ts",
            interpreter: "node",
            interpreter_args: "--import tsx",
            env: {
                NODE_ENV: "production",
                PORT: 3000,
            },
            // Optional: uncomment and configure for cloud storage
            // env: {
            //   NODE_ENV: 'production',
            //   PORT: 3000,
            //   // Turso database
            //   TURSO_DATABASE_URL: 'libsql://your-db.turso.io',
            //   TURSO_AUTH_TOKEN: 'your-token',
            //   // S3 storage
            //   S3_BUCKET: 'your-bucket',
            //   S3_REGION: 'us-east-1',
            //   S3_ACCESS_KEY_ID: 'your-key',
            //   S3_SECRET_ACCESS_KEY: 'your-secret',
            //   S3_ENDPOINT: 'https://s3.amazonaws.com'
            // },
            instances: 1,
            exec_mode: "fork",
            autorestart: true,
            watch: false,
            max_memory_restart: "250M",
            time: true,
        },
    ],
};
