export class Link {
  constructor(
    public readonly id: string,
    public readonly pageId: string,
    public readonly href: string,
    public readonly name: string,
    public readonly createdAt: Date,
  ) {}
}
