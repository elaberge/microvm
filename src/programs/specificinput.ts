import { Z80 as Z80Module } from "../archs/z80";
import { Programs } from "./programs";
import { Z80Programs } from "./z80programs";
import { IOperand } from "../operands/ioperand";
import { NumberOp } from "../operands/constant";

import Z80 = Z80Module.Op;
import Z80Arch = Z80Module.Z80Arch;
import Z80Linker = Z80Programs.Z80Linker;
import JoyBits = Z80Programs.JoyBits;
export type IProgram = Programs.IProgram<Z80Arch>;

/*
  volatile char target;

  int main() {
    gprintf("Press UP");
    while (1) {
      if (joypad() & J_UP) {
        target = 1;
      }

      if (target != 0) {
        gotogxy(4, 4);
        gprintf("END");
        return 0;
      }
      wait_vbl_done();
    }
    return 0;
  }
*/

export const SpecificInput: IProgram = function () {
  let addr = 0;
  const TargetAddr = NumberOp(addr++);
  const PressUpStrAddr = NumberOp(addr++);
  const EndStrAddr = NumberOp(addr++);

  const memory = [0, 100 /*"Press UP"*/, 999 /*"END"*/];

  return {
    addr: {
      pressUpStr: () => memory[PressUpStrAddr.get()],
      endStr: () => memory[EndStrAddr.get()],
    },

    memory: memory,

    program: (z: Z80Arch) => {
      const linker = new Z80Linker(z);

      const prog = [
        linker.label("_main"),
        // gprintf("Press Up")
        Z80.LD(z.HL, PressUpStrAddr),
        Z80.PUSH(z.HL),
        Z80.CALL(linker.link("_gprintf")),
        Z80.ADD(z.SP, NumberOp(1)),
        // while (1) {
        linker.label("00106$"),
        //   if (joypad() & J_UP) {
        Z80.CALL(linker.link("_joypad")),
        Z80.LD(z.C, NumberOp(0x00)),
        Z80.BIT(JoyBits.UP, z.B),
        Z80.JP_NotCond(z.Z, linker.link("00119$")),
        Z80.JP(linker.link("00102$")),
        linker.label("00119$"),
        //     target = 1;
        //   }
        Z80.LD(z.HL, TargetAddr),
        Z80.LD_To_HL(NumberOp(1)),
        //   if (target != 0) {
        linker.label("00102$"),
        Z80.LD(z.HL, TargetAddr),
        Z80.LD_From_HL(z.A),
        Z80.OR(z.A, z.A),
        Z80.JP_Cond(z.Z, linker.link("00104$")),
        //     gotogxy(4, 4);
        Z80.LD(z.HL, NumberOp(0x0404)),
        Z80.PUSH(z.HL),
        Z80.CALL(linker.link("_gotoxy")),
        Z80.ADD(z.SP, NumberOp(1)),
        //     gprintf("END");
        Z80.LD(z.HL, EndStrAddr),
        Z80.PUSH(z.HL),
        Z80.CALL(linker.link("_gprintf")),
        Z80.ADD(z.SP, NumberOp(1)),
        //     return 0;
        //   }
        Z80.LD(z.DE, NumberOp(0)),
        Z80.JP(linker.link("00108$")),
        //   wait_vbl_done()
        linker.label("00104$"),
        Z80.CALL(linker.link("_wait_vbl_done")),
        // }
        Z80.JP(linker.link("00106$")),
        // return 0;
        linker.label("00108$"),
        Z80.RET(),
      ];

      return linker.compile(prog);
    },
  };
}();