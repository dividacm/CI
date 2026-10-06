export type CommandHandler = () => void | Promise<void>;

export class CommandRegistry {
  private readonly commands = new Map<string, CommandHandler>();

  public register(name: string, handler: CommandHandler): void {
    this.commands.set(name, handler);
  }

  public async execute(name: string | undefined): Promise<boolean> {
    if (!name) return false;
    const handler = this.commands.get(name);
    if (!handler) return false;
    await handler();
    return true;
  }
}
