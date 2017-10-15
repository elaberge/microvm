import { IDependencySerializer } from "./idependencyserializer";
import { IDepOperand } from "../dependencylog";

export class StringDependencySerializer implements IDependencySerializer {
  private _lines: string[] = [];

  private curDep: string;
  private itemDep: string[];
  private itemSetDep: string[];
  private msg: string;

  get lines(): string[] {
    return this._lines;
  }

  addRoot(entry: IDepOperand): void { }

  newEntry(entry: IDepOperand): void {
    this.curDep = entry.string();
    this.itemDep = [];
  }

  endEntry(): void {
    this._lines.push(`${this.curDep} <= ${this.itemDep.join(", ")}`.trim());
  }

  newSet(msg: string): void {
    this.itemSetDep = [];
    this.msg = msg;
  }

  endSet(): void {
    this.itemDep.push(`${this.msg}(${this.itemSetDep.join(", ")})`);
  }

  addDep(entry: IDepOperand): void {
    this.itemSetDep.push(entry.string());
  }
}