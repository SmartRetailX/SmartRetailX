import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { AllowAnonymous, AuthService } from '@thallesp/nestjs-better-auth';

import type { Auth } from '../lib/better-auth';
import { SwaggerDocumentService } from './swagger-document.service';

/**
 * API Documentation Controller
 * Serves Scalar documentation with merged Better Auth and NestJS endpoints
 */
@ApiExcludeController()
@AllowAnonymous()
@Controller()
export class DocsController {
  constructor(
    private readonly authService: AuthService<Auth>,
    private readonly swaggerDocService: SwaggerDocumentService,
  ) {}

  /**
   * Combined OpenAPI spec endpoint
   * Merges auto-generated Swagger spec with Better Auth schema
   */
  @Get('openapi/combined.json')
  async getCombinedSpec() {
    const swaggerDoc = this.swaggerDocService.getDocument();
    const authSchema = await this.authService.api.generateOpenAPISchema();

    // Prefix auth paths and clean up schema
    const prefixedAuthPaths: Record<string, any> = {};

    for (const [path, pathItem] of Object.entries(authSchema.paths || {})) {
      const prefixedPath = `/auth${path}`;
      prefixedAuthPaths[prefixedPath] = pathItem;

      // Set tags to Authentication only and clean up optional fields
      for (const method of Object.keys(pathItem)) {
        const operation = pathItem[method];
        if (!operation) continue;

        if (operation.tags) {
          operation.tags = ['Authentication'];
        }

        // Remove optional fields from request body schema to prevent Scalar from sending null values
        const schema = operation.requestBody?.content?.['application/json']?.schema;
        if (schema?.properties) {
          const optionalFields = ['rememberMe', 'callbackURL'];
          optionalFields.forEach((field) => {
            delete schema.properties[field];
          });
          if (Array.isArray(schema.required)) {
            schema.required = schema.required.filter((f: string) => !optionalFields.includes(f));
          }
        }
      }
    }

    return {
      openapi: swaggerDoc.openapi || '3.0.0',
      info: {
        ...swaggerDoc.info,
        title: 'Smart RetailX API Documentation',
        description: 'API reference for Smart RetailX platform',
      },
      servers: swaggerDoc.servers || [],
      tags: [
        { name: 'Authentication', description: 'User authentication and session management' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(swaggerDoc.tags || []).filter((tag: any) => tag.name !== 'Authentication'),
      ],
      paths: {
        ...prefixedAuthPaths,
        ...swaggerDoc.paths,
      },
      components: {
        schemas: {
          ...(authSchema.components?.schemas || {}),
          ...(swaggerDoc.components?.schemas || {}),
        },
        securitySchemes: {
          ...(authSchema.components?.securitySchemes || {}),
          ...(swaggerDoc.components?.securitySchemes || {}),
        },
      },
    };
  }
}
