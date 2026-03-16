import { Controller, Get, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { AllowAnonymous, AuthService } from '@thallesp/nestjs-better-auth';
import type { Request, Response } from 'express';

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
    const serverBasePath = this.extractServerBasePath(swaggerDoc?.servers);
    const normalizedSwaggerPaths = this.normalizeSwaggerPaths(
      swaggerDoc?.paths,
      serverBasePath,
    );

    // Prefix auth paths and fix tags
    const prefixedAuthPaths: Record<string, any> = {};

    for (const [path, pathItem] of Object.entries(authSchema.paths || {})) {
      const prefixedPath = `/auth${path}`;
      prefixedAuthPaths[prefixedPath] = pathItem;

      // Set tags to Authentication only and clean up optional fields
      for (const method of Object.keys(pathItem)) {
        const operation = pathItem[method];
        if (!operation) continue;

        // Set correct tag
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
          // Also remove from required array if present
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
        ...normalizedSwaggerPaths,
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

  private extractServerBasePath(
    servers: Array<{ url: string }> | undefined,
  ): string | null {
    const serverUrl = servers?.[0]?.url;
    if (!serverUrl) {
      return null;
    }

    try {
      const parsedUrl = new URL(serverUrl);
      const pathname = parsedUrl.pathname.replace(/\/$/, '');
      return pathname && pathname !== '/' ? pathname : null;
    } catch {
      return null;
    }
  }

  private normalizeSwaggerPaths(
    paths: Record<string, any> | undefined,
    basePath: string | null,
  ): Record<string, any> {
    if (!paths || !basePath) {
      return paths || {};
    }

    const normalized: Record<string, any> = {};

    for (const [path, pathItem] of Object.entries(paths)) {
      const normalizedPath =
        path === basePath
          ? '/'
          : path.startsWith(`${basePath}/`)
            ? path.slice(basePath.length)
            : path;

      normalized[normalizedPath || '/'] = pathItem;
    }

    return normalized;
  }

  /**
   * Scalar API documentation page
   */
  @Get('docs')
  async getDocs(@Req() req: Request, @Res() res: Response) {
    const specUrl = `${req.protocol}://${req.get('host')}/api/openapi/combined.json`;

    const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Smart RetailX API Documentation</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script
      id="api-reference"
      data-url="${specUrl}"
      data-theme="purple"
      data-layout="modern"
      data-show-sidebar="true"
      data-search-hotkey="k"
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`.trim();

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}
