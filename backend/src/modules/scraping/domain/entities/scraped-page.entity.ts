import { PageStatus } from '../enums/page-status.enum';

export class ScrapedPage {
  constructor(
    public readonly id: string,
    public readonly url: string,
    public readonly title: string | null,
    public readonly status: PageStatus,
    public readonly linkCount: number,
    public readonly errorMessage: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static createInProgress(
    id: string,
    url: string,
    now = new Date(),
  ): ScrapedPage {
    return new ScrapedPage(
      id,
      url,
      null,
      PageStatus.IN_PROGRESS,
      0,
      null,
      now,
      now,
    );
  }
}
