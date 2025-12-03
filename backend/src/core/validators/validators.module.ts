import { Global, Module } from '@nestjs/common';
import { InputValidatorService } from './input-validator.service.js';

@Global()
@Module({
  providers: [InputValidatorService],
  exports: [InputValidatorService],
})
export class ValidatorsModule {}
