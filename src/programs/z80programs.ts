import { Z80 as Z80Module } from "../archs/z80";
import { Programs } from "./programs";
import { NumberOp } from "../operands/constant";
import { IInstruction } from "../iinstruction";

import Z80 = Z80Module.Op;
import Z80Arch = Z80Module.Z80Arch;

export namespace Z80Programs {
  function build(arch: Z80Arch, cmds: Programs.IInstrCmd<Z80Arch>[]): IInstruction[] {
    const instr: IInstruction[][] = [];
    let offset: number = 0;

    cmds.forEach((cmd) => {
      const instrs = cmd(arch, offset);
      offset += instrs.length;
      instr.push(instrs);
    });

    return [].concat.apply([], instr);
  };

  export class Z80Linker extends Programs.Linker<Z80Arch> {
    constructor(arch: Z80Arch) {
      super(arch, build, CommonRuntime);
    }
  }

  export enum JoyBits {
    START = 7,
    SELECT = 6,
    B = 5,
    A = 4,
    DOWN = 3,
    UP = 2,
    LEFT = 1,
    RIGHT = 0,
  }

  export enum JoyCodes {
    START = 1 << JoyBits.START,
    SELECT = 1 << JoyBits.SELECT,
    B = 1 << JoyBits.B,
    A = 1 << JoyBits.A,
    DOWN = 1 << JoyBits.DOWN,
    UP = 1 << JoyBits.UP,
    LEFT = 1 << JoyBits.LEFT,
    RIGHT = 1 << JoyBits.RIGHT,
    NONE = 0,
  }

  function CommonRuntime(z: Z80Arch, linker: Z80Linker) {
    return [
      Z80.LD(z.SP, NumberOp(999)),
      Z80.CALL(linker.link("_main")),
      Z80.STOP(),
      linker.label("_gprintf"),
      Z80.LD(z.HL, z.SP),
      Z80.ADD(z.HL, NumberOp(2)),
      Z80.LD_From_HL(z.HL),
      Z80.LD_From_HL(z.getOut(0)),
      Z80.RET(),
      linker.label("_gotoxy"),
      Z80.LD(z.HL, z.SP),
      Z80.ADD(z.HL, NumberOp(2)),
      Z80.LD_From_HL(z.getOut(1)),
      Z80.RET(),
      linker.label("_wait_vbl_done"),
      Z80.RET(),
      linker.label("_joypad"),
      Z80.LD(z.B, z.getIn(0)),
      Z80.RET(),
    ];
  }
}