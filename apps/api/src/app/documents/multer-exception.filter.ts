import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { MulterError } from 'multer';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter<MulterError> {
  catch(error: MulterError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse();
    const tooLarge = error.code === 'LIMIT_FILE_SIZE';
    response.status(tooLarge ? HttpStatus.PAYLOAD_TOO_LARGE : HttpStatus.BAD_REQUEST).json({
      statusCode: tooLarge ? HttpStatus.PAYLOAD_TOO_LARGE : HttpStatus.BAD_REQUEST,
      error: tooLarge ? 'Payload Too Large' : 'Bad Request',
      message: tooLarge ? 'Maximum document size is 20 MiB.' : 'The uploaded document request is invalid.',
    });
  }
}
