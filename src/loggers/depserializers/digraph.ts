import { writeFileSync } from "fs";
import { IDependencySerializer } from "./idependencyserializer";
import { IDepOperand } from "../dependencylog";

interface DigraphSerializerSet {
  setContent: IDepOperand[];
  message: string;
}

class SymbolDepOperand implements IDepOperand {
  constructor(private str: string) { }
  constant() { return true; }
  special() { return true; }
  string() { return this.str; }
}

export class DigraphDependencySerializer implements IDependencySerializer {
  private idMap = new Map<IDepOperand, number>();
  private roots = new Set<IDepOperand>();
  private nextId = 0;

  private entries = new Set<IDepOperand>();
  private entryMap = new Map<IDepOperand, DigraphSerializerSet[]>();
  private curEntry: DigraphSerializerSet[];
  private curSet: DigraphSerializerSet;

  private links = new Set<string>();

  private getEntryId(entry: IDepOperand) {
    if (this.idMap.has(entry) == false)
      this.idMap.set(entry, this.nextId++);
    return `ID_${this.idMap.get(entry)}`;
  }

  constructor(private labelFilter: (tag: string) => string = (t) => t) {
  }

  addRoot(entry: IDepOperand): void {
    this.roots.add(entry);
  }

  newEntry(entry: IDepOperand): void {
    this.entries.add(entry);
    this.curEntry = [];
    this.entryMap.set(entry, this.curEntry);
  }

  endEntry(): void { }

  newSet(msg: string): void {
    this.curSet = { setContent: [], message: msg };
    this.curEntry.push(this.curSet);
  }

  endSet(): void { }

  addDep(entry: IDepOperand): void {
    this.entries.add(entry);
    this.curSet.setContent.push(entry);
  }

  private labelShape(entry: IDepOperand): string {
    if (entry instanceof SymbolDepOperand)
      return "circle";
    if (entry.constant() || entry.special())
      return "box";
    return "ellipse";
  }

  private label(entry: IDepOperand, style = "solid") {
    return `${this.getEntryId(entry)} [label="${this.labelFilter(entry.string())}" shape=${this.labelShape(entry)} style=${style}];`
  }

  private link(src: IDepOperand, dst: IDepOperand, msg: string = undefined) {
    let lbl = "";
    if (msg != undefined)
      lbl = ` [label="${msg}"]`;
    return `${this.getEntryId(src)} -> ${this.getEntryId(dst)}${lbl};`;
  }

  private forEachSet(entry: IDepOperand, setContent: DigraphSerializerSet) {
    const lines: string[] = [];
    if (setContent.setContent.length > 1) {
      const join = new SymbolDepOperand(setContent.message);
      lines.push(this.label(join, "filled"));
      lines.push(this.link(entry, join));
      setContent.setContent.forEach((dst) => {
        lines.push(this.link(join, dst));
      });
    } else {
      lines.push(this.link(entry, setContent.setContent[0], setContent.message));
    }
    return lines;
  }

  private forEachEntry(entry: IDepOperand, sets: DigraphSerializerSet[]) {
    const lines: string[] = [];
    if (sets.length > 1) {
      const phi = new SymbolDepOperand("phi");
      lines.push(this.label(phi, "filled"));
      lines.push(this.link(entry, phi));
      entry = phi;
    }
    sets.forEach((setContent) => {
      lines.push(...this.forEachSet(entry, setContent));
    });
    return lines;
  }

  toString() {
    const lines = ["digraph {"];
    this.entries.forEach((entry) => {
      lines.push(this.label(entry, this.roots.has(entry) ? '"bold,filled"' : "solid"));
    });

    this.entryMap.forEach((depSet, entry) => {
      lines.push(...this.forEachEntry(entry, depSet));
    });
    lines.push("}");

    const usedLines = new Set<string>();

    return lines.filter((l) => {
      if (usedLines.has(l))
        return false;
      usedLines.add(l);
      return true;
    }).join("\n");
  }

  write(filename: string) {
    writeFileSync(filename, this.toString());
  }
}