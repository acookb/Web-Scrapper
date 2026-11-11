export class PageNotFoundError extends Error {
  constructor(public readonly pageId: string) {
    super(`Page ${pageId} not found`);
    this.name = PageNotFoundError.name;
  }
}
