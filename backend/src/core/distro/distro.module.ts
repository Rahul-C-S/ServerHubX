import { Global, Module } from '@nestjs/common';
import { DistroDetectorService } from './distro-detector.service.js';
import { PathResolverService } from './path-resolver.service.js';

@Global()
@Module({
  providers: [DistroDetectorService, PathResolverService],
  exports: [DistroDetectorService, PathResolverService],
})
export class DistroModule {}
