export interface IOpExtension {
  key: string;
  op: IOperand;
}

export interface IOperand {
  hashCode(): number;
  clone(): IOperand;
  peek(): number;
  get(): number;
  set(val: number): void;
  string(): string;
  ext<T extends IOpExtension>(id: string): T;
  join<T extends IOpExtension>(ext: T): void;
  join<T extends IOpExtension>(ext: T, id: string): void;
  delete(id: string): void;
  special(): boolean;
}

export class VoidOperand<T extends IOperand> implements IOperand {
  private _extensions = new Map<string, IOpExtension>();

  hashCode(): number {
    return this.peek();
  }

  clone(): T {
    throw new Error("Method not implemented.");
  }

  peek(): number {
    return this.get();
  }

  get(): number {
    throw new Error("Method not implemented.");
  }

  set(val: number): void {
    throw new Error("Method not implemented.");
  }

  string(): string {
    throw new Error("Method not implemented.");
  }

  ext<T extends IOpExtension>(id: string) {
    return <T>this._extensions.get(id);
  }

  join<T extends IOpExtension>(ext: T, id: string = ext.key) {
    ext.op = this;
    this._extensions.set(id, ext);
  }

  delete(id: string) {
    this._extensions.delete(id);
  }

  special() {
    return false;
  }
}