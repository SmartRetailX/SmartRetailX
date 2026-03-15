import { ChatTableContent } from '@/types';
import { AssistantSuccessMessage } from '@/types/chat.domain';

class MarkdownFormatter {
  /**
   * Converts an agent response to Markdown
   * @param response The agent response to convert
   * @returns Markdown string
   */
  public static convert(response: AssistantSuccessMessage): string {
    // Handle error cases first
    if (!response.success) {
      if (response.content) return response.content;
      if (response.error) return response.error;
      return 'An error occurred. Please try again.';
    }

    const markdownParts: string[] = [];

    // Convert primary response
    if (response.primary) {
      markdownParts.push(this.convertPrimaryResponse(response.primary));
    }

    // Add sources if available
    if (response.sources?.length) {
      markdownParts.push(`## Sources\n`);
      markdownParts.push(response.sources.map((source) => `- ${source}`).join('\n'));
    }

    return markdownParts.join('\n\n');
  }

  /**
   * Converts the primary response to Markdown
   * @param response The primary response to convert
   * @returns Markdown string
   */
  private static convertPrimaryResponse(response: {
    type: 'markdown' | 'table' | 'text';
    content?: string | ChatTableContent;
  }): string {
    if (!response.content) return 'No content available.';

    switch (response.type) {
      case 'markdown':
        return String(response.content);
      case 'table':
        return this.convertTable(response.content as ChatTableContent);
      case 'text':
        return String(response.content);
      default:
        return JSON.stringify(response.content);
    }
  }

  /**
   * Converts table content to Markdown table
   * @param content The table content
   * @returns Markdown string
   */
  private static convertTable(content: ChatTableContent): string {
    let tableMarkdown = '';

    // Table headers
    tableMarkdown += `| ${content.headers.join(' | ')} |\n`;
    tableMarkdown += `| ${content.headers.map(() => '---').join(' | ')} |\n`;

    // Convert object rows to arrays if needed
    let rows: unknown[][];
    if (content.rows.length > 0 && !Array.isArray(content.rows[0])) {
      rows = (content.rows as Record<string, unknown>[]).map((row) =>
        content.headers.map((header) => row[header]),
      );
    } else {
      rows = content.rows as unknown[][];
    }

    // Add rows
    rows.forEach((row) => {
      tableMarkdown += `| ${row
        .map((cell) => (cell !== null && cell !== undefined ? String(cell) : ''))
        .join(' | ')} |\n`;
    });

    // Add total rows if available
    if (content.total_rows !== undefined) {
      tableMarkdown += `\n*Total rows: ${content.total_rows}*`;
    }

    return tableMarkdown;
  }
}

export { MarkdownFormatter };
