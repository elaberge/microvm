import { Arch } from "./arch";
import { ILogger } from "./loggers/ilogger";

export interface IInstruction {
  exec(arch: Arch, logger: ILogger): boolean;
  getString(): string;
}
