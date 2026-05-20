import "./load-env.js";
import "reflect-metadata";
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

@Catch()
class LogExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    console.error("[control-plane]", exception);
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, message: "Internal server error" };
    res.status(status).json(body);
  }
}

async function bootstrap() {
  const port = Number(process.env.PORT ?? 3001);
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new LogExceptionsFilter());
  app.enableCors();
  await app.listen(port);
  console.log(`control-plane listening on ${port}`);
}
bootstrap();
