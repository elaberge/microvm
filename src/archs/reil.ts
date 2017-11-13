import { Arch } from "../arch";
import { IInstruction } from "../iinstruction";
import { ILogger, ILoggerExtension } from "../loggers/ilogger";
import { OpKey as DependencyKey } from "../loggers/dependencylog";
import { IOperand } from "../operands/ioperand";
import { NumberOp } from "../operands/constant";
import { Filter as DepFilter, PreSet as DepPreSet } from "./reildependency";

export namespace REIL {
  export interface ILogFn<T, TL extends ILoggerExtension> {
    [name: string]: (logger: TL, a: IOperand, b: IOperand, dst: IOperand, aF: T, bF: T, dstF: T) => void;
  }

  export interface IFilter<T> {
    aF: T;
    bF: T;
    dstF: T;
  }

  interface IFilterFn<T> {
    (a: IOperand, b: IOperand, dst: IOperand): IFilter<T>;
  }

  const filterMap = new Map<string, IFilterFn<{}>>([[DependencyKey, DepFilter]]);
  const preSetMap = new Map<string, ILogFn<{}, ILoggerExtension>>([[DependencyKey, DepPreSet]]);

  function PreSet(logger: ILogger, name: string, a: IOperand, b: IOperand, dst: IOperand) {
    logger.keys().forEach((extName) => {
      if (filterMap.has(extName) == false || preSetMap.has(extName) == false)
        return;
      const filtered = filterMap.get(extName)(a, b, dst);
      const logFn = preSetMap.get(extName);
      const fn = logFn[name];
      if (fn)
        fn(logger.ext(extName), a, b, dst, filtered.aF, filtered.bF, filtered.dstF);
    });
  }

  function incPC(arch: Arch, logger: ILogger) {
    const pcReg = arch.getPCReg();
    PreSet(logger, "incPC", pcReg, undefined, pcReg);
    pcReg.set(pcReg.get() + 1);
  }

  function ADD(a: IOperand, b: IOperand, dst: IOperand): IInstruction {
    return {
      exec(arch: Arch, logger: ILogger) {
        PreSet(logger, "add", a, b, dst);
        dst.set(a.get() + b.get());
        incPC(arch, logger);
        return true;
      },
      getString() {
        return `ADD ${a.string()}, ${b.string()}, ${dst.string()}`;
      },
    };
  };

  function SUB(a: IOperand, b: IOperand, dst: IOperand): IInstruction {
    return {
      exec(arch: Arch, logger: ILogger) {
        PreSet(logger, "sub", a, b, dst);
        dst.set(a.get() - b.get());
        incPC(arch, logger);
        return true;
      },
      getString() {
        return `SUB ${a.string()}, ${b.string()}, ${dst.string()}`;
      },
    };
  };

  function MUL(a: IOperand, b: IOperand, dst: IOperand): IInstruction {
    return {
      exec(arch: Arch, logger: ILogger) {
        PreSet(logger, "mul", a, b, dst);
        dst.set(a.get() * b.get());
        incPC(arch, logger);
        return true;
      },
      getString() {
        return `MUL ${a.string()}, ${b.string()}, ${dst.string()}`;
      },
    };
  };

  function DIV(a: IOperand, b: IOperand, dst: IOperand): IInstruction {
    return {
      exec(arch: Arch, logger: ILogger) {
        PreSet(logger, "div", a, b, dst);
        dst.set(Math.trunc(a.get() / b.get()));
        incPC(arch, logger);
        return true;
      },
      getString() {
        return `DIV ${a.string()}, ${b.string()}, ${dst.string()}`;
      },
    };
  };

  function MOD(a: IOperand, b: IOperand, dst: IOperand): IInstruction {
    return {
      exec(arch: Arch, logger: ILogger) {
        PreSet(logger, "mod", a, b, dst);
        dst.set(a.get() % b.get());
        incPC(arch, logger);
        return true;
      },
      getString() {
        return `MOD ${a.string()}, ${b.string()}, ${dst.string()}`;
      },
    };
  };

  function BSH(a: IOperand, b: IOperand, dst: IOperand): IInstruction {
    return {
      exec(arch: Arch, logger: ILogger) {
        PreSet(logger, "bsh", a, b, dst);
        if (b.get() > 0)
          dst.set(a.get() >> b.get());
        else
          dst.set(a.get() << (-b.get()));
        incPC(arch, logger);
        return true;
      },
      getString() {
        return `BSH ${a.string()}, ${b.string()}, ${dst.string()}`;
      },
    };
  };

  function AND(a: IOperand, b: IOperand, dst: IOperand): IInstruction {
    return {
      exec(arch: Arch, logger: ILogger) {
        PreSet(logger, "and", a, b, dst);
        dst.set(a.get() & b.get());
        incPC(arch, logger);
        return true;
      },
      getString() {
        return `AND ${a.string()}, ${b.string()}, ${dst.string()}`;
      },
    };
  };

  function OR(a: IOperand, b: IOperand, dst: IOperand): IInstruction {
    return {
      exec(arch: Arch, logger: ILogger) {
        PreSet(logger, "or", a, b, dst);
        dst.set(a.get() | b.get());
        incPC(arch, logger);
        return true;
      },
      getString() {
        return `OR ${a.string()}, ${b.string()}, ${dst.string()}`;
      },
    };
  };

  function XOR(a: IOperand, b: IOperand, dst: IOperand): IInstruction {
    return {
      exec(arch: Arch, logger: ILogger) {
        PreSet(logger, "xor", a, b, dst);
        dst.set(a.get() ^ b.get());
        incPC(arch, logger);
        return true;
      },
      getString() {
        return `XOR ${a.string()}, ${b.string()}, ${dst.string()}`;
      },
    };
  };

  function LDM(a: IOperand, b: IOperand, dst: IOperand): IInstruction {
    return {
      exec(arch: Arch, logger: ILogger) {
        const mem = arch.getMem(a.get());
        PreSet(logger, "ldm", a, mem, dst);
        dst.set(mem.get());
        incPC(arch, logger);
        return true;
      },
      getString() {
        return `LDM ${a.string()}, , ${dst.string()}`;
      },
    };
  };

  function STM(a: IOperand, b: IOperand, dst: IOperand): IInstruction {
    return {
      exec(arch: Arch, logger: ILogger) {
        const mem = arch.getMem(dst.get());
        PreSet(logger, "stm", a, dst, mem);
        mem.set(a.get());
        incPC(arch, logger);
        return true;
      },
      getString() {
        return `STM ${a.string()}, , ${dst.string()}`;
      },
    };
  };

  function STR(a: IOperand, b: IOperand, dst: IOperand): IInstruction {
    return {
      exec(arch: Arch, logger: ILogger) {
        PreSet(logger, "str", a, undefined, dst);
        dst.set(a.get());
        incPC(arch, logger);
        return true;
      },
      getString() {
        return `STR ${a.string()}, , ${dst.string()}`;
      },
    };
  };

  function BISZ(a: IOperand, b: IOperand, dst: IOperand): IInstruction {
    return {
      exec(arch: Arch, logger: ILogger) {
        PreSet(logger, "bisz", a, b, dst);
        dst.set(a.get() == 0 ? 1 : 0);
        incPC(arch, logger);
        return true;
      },
      getString() {
        return `BISZ ${a.string()}, , ${dst.string()}`;
      },
    };
  };

  function JCC(a: IOperand, b: IOperand, dst: IOperand): IInstruction {
    return {
      exec(arch: Arch, logger: ILogger) {
        const pc = arch.getPCReg();
        const doJump = a.get() != 0;
        if (doJump) {
          PreSet(logger, "jcc_jump", a, dst, pc);
          pc.set(dst.get());
        }
        else {
          PreSet(logger, "jcc_skip", a, dst, pc);
          pc.set(pc.get() + 1);
        }
        return true;
      },
      getString() {
        return `JCC ${a.string()}, , ${dst.string()}`;
      },
    };
  };

  function UNDEF(a: IOperand, b: IOperand, dst: IOperand): IInstruction {
    return {
      exec(arch: Arch, logger: ILogger) {
        PreSet(logger, "undef", undefined, undefined, dst);
        dst.set(undefined);
        incPC(arch, logger);
        return true;
      },
      getString() {
        return `UNDEF , , ${dst.string()}`;
      },
    };
  };

  function UNKN(a: IOperand, b: IOperand, dst: IOperand): IInstruction {
    return {
      exec(arch: Arch, logger: ILogger) {
        incPC(arch, logger);
        return false;
      },
      getString() {
        return `UNKN , ,`;
      },
    };
  };

  function NOP(a: IOperand, b: IOperand, dst: IOperand): IInstruction {
    return {
      exec(arch: Arch, logger: ILogger) {
        incPC(arch, logger);
        return true;
      },
      getString() {
        return `NOP , ,`;
      },
    };
  };

  export const Op = {
    ADD: ADD,
    SUB: SUB,
    MUL: MUL,
    DIV: DIV,
    MOD: MOD,
    BSH: BSH,
    AND: AND,
    OR: OR,
    XOR: XOR,
    LDM: LDM,
    STM: STM,
    STR: STR,
    BISZ: BISZ,
    JCC: JCC,
    UNDEF: UNDEF,
    UNKN: UNKN,
    NOP: NOP,
  }

  function extractOperand(arch: Arch, labels: Map<string, number>, desc: string): IOperand {
    const constant = desc.match(/%([\+|\-]?\d+)/);
    if (constant != null)
      return NumberOp(parseInt(constant[1]));

    const memAddr = desc.match(/\[(\d+)\]/);
    if (memAddr != null)
      return arch.getMem(parseInt(memAddr[1]));

    const inChannel = desc.match(/IN(\d+)/);
    if (inChannel != null)
      return arch.getIn(parseInt(inChannel[1]));

    const outChannel = desc.match(/OUT(\d+)/);
    if (outChannel != null)
      return arch.getOut(parseInt(outChannel[1]));

    const lbl = desc.match(/\:(\S+)/);
    if (lbl != null)
      return NumberOp(labels.get(lbl[1]));

    const reg = desc.match(/(\S+)/);
    if (reg != null)
      return arch.getReg(reg[1]);

    return undefined;
  }

  export function Parse(arch: Arch, program: string): IInstruction[] {
    interface IPending {
      fn: (a: IOperand, b: IOperand, dst: IOperand) => IInstruction,
      a: string,
      b: string,
      dst: string,
    }

    interface IOpMap {
      [key: string]: (a: IOperand, b: IOperand, dst: IOperand) => IInstruction
    }

    const opMap: IOpMap = Op;
    const labels = new Map<string, number>();
    const pending: IPending[] = [];

    program.split("\n").forEach((line) => {
      const loopTokens = line.match(/^\s*(\S+)\:(\s)*$/);
      if (loopTokens != null) {
        labels.set(loopTokens[1], pending.length);
        return;
      }
      const tokens = line.match(/^\s*(\S+)\s+(\S*),\s*(\S*),\s*(\S*)$/);
      if (tokens == null) return;
      pending.push({
        fn: opMap[tokens[1]],
        a: tokens[2],
        b: tokens[3],
        dst: tokens[4],
      });
    });

    const decoded: IInstruction[] = [];
    pending.forEach((cmd) => {
      const a = extractOperand(arch, labels, cmd.a);
      const b = extractOperand(arch, labels, cmd.b);
      const dst = extractOperand(arch, labels, cmd.dst);
      decoded.push(cmd.fn(a, b, dst));
    });

    return decoded;
  }
}