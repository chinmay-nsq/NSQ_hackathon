import { app } from "@/app";
import { connectDB } from "@/config/db";
import { env } from "@/config/env";
import { logger } from "@/config/logger";

const startServer = async () => {
  try {
    await connectDB();

    app.listen(env.port, () => {
      logger.info(`Skibidi-Sprint backend listening on http://localhost:${env.port}`);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err}`);
    process.exit(1);
  }
};

startServer();
