import { Injectable } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';

/**
 * Service to store and retrieve the Swagger OpenAPI document
 * This allows the document to be accessed by the docs controller
 */
@Injectable()
export class SwaggerDocumentService {
  private document: OpenAPIObject | null = null;

  setDocument(document: OpenAPIObject): void {
    this.document = document;
  }

  getDocument(): OpenAPIObject | null {
    return this.document;
  }
}
