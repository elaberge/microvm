import { IDepOperand } from "../dependencylog";

export interface IDependencySerializer {
  addRoot(entry: IDepOperand): void;
  newEntry(entry: IDepOperand): void;
  endEntry(): void;
  newSet(msg: string): void;
  endSet(): void;
  addDep(entry: IDepOperand): void;
}